/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { assert } from "@bentley/bentleyjs-core";
import { ProgramBuilder, VariableType, VariablePrecision, FragmentShaderComponent } from "../ShaderBuilder";
import { addModelViewMatrix } from "./Vertex";
import { addWindowToTexCoords } from "./Fragment";
import { TextureUnit } from "../RenderFlags";
import { System } from "../System";
import { ClipDef } from "../TechniqueFlags";
import { addEyeSpace } from "./Common";
import { ClippingType } from "../../System";

const getClipPlaneFloat = `
  vec4 getClipPlane(int index) {
    float x = 0.5;
    float y = (float(index) + 0.5) / float(u_numClips);
    return TEXTURE(s_clipSampler, vec2(x, y));
  }
`;

export const unpackFloat = `
  float unpackFloat(vec4 v) {
    const float bias = 38.0;
    v *= 255.0;
    float temp = v.w / 2.0;
    float exponent = floor(temp);
    float sign = (temp - exponent) * 2.0;
    exponent = exponent - bias;
    sign = -(sign * 2.0 - 1.0);
    float unpacked = sign * v.x * (1.0 / 256.0); // shift right 8
    unpacked += sign * v.y * (1.0 / 65536.0); // shift right 16
    unpacked += sign * v.z * (1.0 / 16777216.0); // shift right 24
    return unpacked * pow(10.0, exponent);
  }
`;

// ###TODO: oct-encode the normal to reduce # of samples from 4 to 2
const unpackClipPlane = `
  vec4 getClipPlane(int index) {
    float y = (float(index) + 0.5) / float(u_numClips);
    float sx = 0.25;
    vec2 tc = vec2(0.125, y);
    float nx = unpackFloat(TEXTURE(s_clipSampler, tc));
    tc.x += sx;
    float ny = unpackFloat(TEXTURE(s_clipSampler, tc));
    tc.x += sx;
    float nz = unpackFloat(TEXTURE(s_clipSampler, tc));
    tc.x += sx;
    float dist = unpackFloat(TEXTURE(s_clipSampler, tc));
    return vec4(nx, ny, nz, dist);
  }
`;

const calcClipPlaneDist = `
  float calcClipPlaneDist(vec3 camPos, vec4 plane) {
    return dot(vec4(camPos, 1.0), plane);
  }
`;

const applyClipPlanes = `
  int numPlaneSets = 1;
  int numSetsClippedBy = 0;
  bool clippedByCurrentPlaneSet = false;
  for (int i = 0; i < MAX_CLIPPING_PLANES; i++)
      {
      if (i >= u_numClips)
          break;

      vec4 plane = getClipPlane(i);
      if (plane.xyz == vec3(0.0)) // indicates start of new clip plane set
          {
          numPlaneSets = numPlaneSets + 1;
          numSetsClippedBy += int(clippedByCurrentPlaneSet);
          clippedByCurrentPlaneSet = false;
          }
      else if (!clippedByCurrentPlaneSet && calcClipPlaneDist(v_eyeSpace, plane) < 0.0)
          clippedByCurrentPlaneSet = true;
      }

  numSetsClippedBy += int(clippedByCurrentPlaneSet);
  if (numSetsClippedBy == numPlaneSets)
      discard;
`;

const applyClipMask = `
  vec2 tc = windowCoordsToTexCoords(gl_FragCoord.xy);
  vec4 texel = TEXTURE(s_clipSampler, tc);
  if (texel.r < 0.5)
    discard;
`;

/** @internal */
export function addClipping(prog: ProgramBuilder, clipDef: ClipDef) {
  if (clipDef.type === ClippingType.Mask)
    addClippingMask(prog);
  else if (clipDef.type === ClippingType.Planes)
    addClippingPlanes(prog, clipDef.numberOfPlanes);
}

function addClippingPlanes(prog: ProgramBuilder, maxClipPlanes: number) {
  assert(maxClipPlanes > 0);
  const frag = prog.frag;
  const vert = prog.vert;

  addEyeSpace(prog);
  prog.addUniform("u_numClips", VariableType.Int, (program) => {
    program.addGraphicUniform("u_numClips", (uniform, params) => {
      const doClipping = true; // set to false to visualize pre-shader culling of geometry...
      const numClips = (doClipping && params.target.hasClipVolume) ? params.target.clips.count : 0;
      assert(numClips > 0 || !doClipping);
      uniform.setUniform1i(numClips);
    });
  });

  addModelViewMatrix(vert);

  if (System.instance.capabilities.supportsTextureFloat) {
    frag.addFunction(getClipPlaneFloat);
  } else {
    frag.addFunction(unpackFloat);
    frag.addFunction(unpackClipPlane);
  }

  frag.addFunction(calcClipPlaneDist);
  frag.maxClippingPlanes = maxClipPlanes;
  frag.addUniform("s_clipSampler", VariableType.Sampler2D, (program) => {
    program.addGraphicUniform("s_clipSampler", (uniform, params) => {
      const texture = params.target.clips.texture;
      assert(texture !== undefined);
      if (texture !== undefined)
        texture.bindSampler(uniform, TextureUnit.ClipVolume);
    });
  }, VariablePrecision.High);
  frag.set(FragmentShaderComponent.ApplyClipping, applyClipPlanes);
}

function addClippingMask(prog: ProgramBuilder) {
  prog.frag.addUniform("s_clipSampler", VariableType.Sampler2D, (program) => {
    program.addGraphicUniform("s_clipSampler", (uniform, params) => {
      const texture = params.target.clipMask;
      assert(texture !== undefined);
      if (texture !== undefined)
        texture.bindSampler(uniform, TextureUnit.ClipVolume);
    });
  }, VariablePrecision.High);

  addWindowToTexCoords(prog.frag);
  prog.frag.set(FragmentShaderComponent.ApplyClipping, applyClipMask);
}
