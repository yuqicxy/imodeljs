/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module WebGL
 */

import { assert } from "@bentley/bentleyjs-core";
import { ClippingType } from "../System";
import { ShaderProgram } from "./ShaderProgram";
import { System } from "./System";
import { ClipDef } from "./TechniqueFlags";
import { vertexDiscard, earlyVertexDiscard, lateVertexDiscard, addPosition } from "./glsl/Vertex";
import { addInstancedModelMatrixRTC } from "./glsl/Instancing";
import { addClipping } from "./glsl/Clipping";
import { AttributeDetails } from "./AttributeMap";
import { volClassOpaqueColor } from "./glsl/PlanarClassification";

// tslint:disable:no-const-enum

/** Describes the data type of a shader program variable.
 * @internal
 */
export const enum VariableType {
  Boolean, // bool
  Int, // int
  Float, // float
  Vec2, // vec2
  Vec3, // vec3
  Vec4, // vec4
  Mat3, // mat3
  Mat4, // mat4
  Sampler2D, // sampler2D
  SamplerCube, // samplerCube

  COUNT,
}

/** Describes the qualifier associated with a shader program variable.
 * @internal
 */
export const enum VariableScope {
  Global, // no qualifier
  Varying, // varying
  Uniform, // uniform

  COUNT,
}

/** Describes the declared or undeclared precision of a shader program variable.
 * @internal
 */
export const enum VariablePrecision {
  Default, // undeclared precision - variable uses the explicit or implicit precision default for its type
  Low, // lowp
  Medium, // mediump
  High, // highp

  COUNT,
}

/** @internal */
namespace Convert {
  export function typeToString(type: VariableType): string {
    switch (type) {
      case VariableType.Boolean: return "bool";
      case VariableType.Int: return "int";
      case VariableType.Float: return "float";
      case VariableType.Vec2: return "vec2";
      case VariableType.Vec3: return "vec3";
      case VariableType.Vec4: return "vec4";
      case VariableType.Mat3: return "mat3";
      case VariableType.Mat4: return "mat4";
      case VariableType.Sampler2D: return "sampler2D";
      case VariableType.SamplerCube: return "samplerCube";
      default: assert(false); return "undefined";
    }
  }

  export function scopeToString(scope: VariableScope): string {
    switch (scope) {
      case VariableScope.Global: return "";
      case VariableScope.Varying: return "varying";
      case VariableScope.Uniform: return "uniform";
      default: assert(false); return "undefined";
    }
  }

  export function precisionToString(precision: VariablePrecision): string {
    switch (precision) {
      case VariablePrecision.Default: return "";
      case VariablePrecision.Low: return "lowp";
      case VariablePrecision.Medium: return "mediump";
      case VariablePrecision.High: return "highp";
      default: assert(false); return "undefined";
    }
  }
}

/**
 * Function invoked by ShaderVariable::AddBinding() to bind the variable to the compiled program.
 * The implementation should call ShaderProgram::AddShaderUniform or ShaderProgram::AddGraphicUniform/Attribute to register a function
 * which can be used to bind the value of the variable when program is used.
 * @internal
 */
export type AddVariableBinding = (prog: ShaderProgram) => void;

/** Represents a variable within a fragment or vertex shader.
 * @internal
 */
export class ShaderVariable {
  private readonly _addBinding?: AddVariableBinding;
  public readonly name: string;
  public readonly value?: string; // for global variables only
  public readonly type: VariableType;
  public readonly scope: VariableScope;
  public readonly precision: VariablePrecision;
  public readonly isConst: boolean = false; // for global variables only

  private constructor(name: string, type: VariableType, scope: VariableScope, precision: VariablePrecision, isConst: boolean, addBinding?: AddVariableBinding, value?: string) {
    this._addBinding = addBinding;
    this.name = name;
    this.value = value;
    this.type = type;
    this.scope = scope;
    this.precision = precision;
    this.isConst = isConst;
  }

  public static create(name: string, type: VariableType, scope: VariableScope, addBinding?: AddVariableBinding, precision: VariablePrecision = VariablePrecision.Default): ShaderVariable {
    return new ShaderVariable(name, type, scope, precision, false, addBinding, undefined);
  }

  public static createGlobal(name: string, type: VariableType, value?: string, isConst: boolean = false) {
    return new ShaderVariable(name, type, VariableScope.Global, VariablePrecision.Default, isConst, undefined, value);
  }

  public get hasBinding(): boolean { return undefined !== this._addBinding; }
  public addBinding(prog: ShaderProgram) {
    if (undefined !== this._addBinding)
      this._addBinding(prog);
  }

  public get typeName(): string { return Convert.typeToString(this.type); }
  public get scopeName(): string { return Convert.scopeToString(this.scope); }
  public get precisionName(): string { return Convert.precisionToString(this.precision); }

  /** Constructs the single-line declaration of this variable */
  public buildDeclaration(): string {
    const parts = new Array<string>();
    if (this.isConst)
      parts.push("const");

    const scopeName = this.scopeName;
    if (0 < scopeName.length)
      parts.push(scopeName);

    const precisionName = this.precisionName;
    if (0 < precisionName.length)
      parts.push(precisionName);

    parts.push(this.typeName);
    parts.push(this.name);

    if (undefined !== this.value && 0 < this.value.length) {
      parts.push("=");
      parts.push(this.value);
    }

    return parts.join(" ") + ";";
  }
}

/**
 * Represents the set of variables defined and used within a fragment or vertex shader.
 * If the same variable is used in both the fragment and vertex shader (e.g., a varying variable), it should be defined in both ShaderBuilders' ShaderVariables object.
 * @internal
 */
export class ShaderVariables {
  protected _list: ShaderVariable[] = new Array<ShaderVariable>();

  /** Find an existing variable with the specified name */
  public find(name: string): ShaderVariable | undefined { return this._list.find((v: ShaderVariable) => v.name === name); }

  /** Add a new variable, if a variable with the same name does not already exist.  return true if added */
  public addVariable(v: ShaderVariable): boolean {
    const found = this.find(v.name);
    if (undefined !== found) {
      assert(found.type === v.type);
      // assume same binding etc...
      return false;
    } else {
      this._list.push(v);
      return true;
    }
  }

  public addUniform(name: string, type: VariableType, binding: AddVariableBinding, precision: VariablePrecision = VariablePrecision.Default) {
    this.addVariable(ShaderVariable.create(name, type, VariableScope.Uniform, binding, precision));
  }

  public addVarying(name: string, type: VariableType): boolean {
    return this.addVariable(ShaderVariable.create(name, type, VariableScope.Varying));
  }

  public addGlobal(name: string, type: VariableType, value?: string, isConst: boolean = false) {
    this.addVariable(ShaderVariable.createGlobal(name, type, value, isConst));
  }

  public addConstant(name: string, type: VariableType, value: string) {
    this.addGlobal(name, type, value, true);
  }

  /** Constructs the lines of glsl code declaring all of the variables. */
  public buildDeclarations(): string {
    let decls = "";
    for (const v of this._list) {
      decls += v.buildDeclaration() + "\n";
    }

    return decls;
  }

  /**
   * For every uniform and attribute variable not contained in the optional 'predefined' list, invokes the associated binding function
   * to add the corresponding Uniform or Attribute object to the ShaderProgram.
   */
  public addBindings(prog: ShaderProgram, predefined?: ShaderVariables): void {
    for (const v of this._list) {
      // Some variables exist in both frag and vert shaders - only add them to the program once.
      if (v.hasBinding && (undefined === predefined || undefined === predefined.find(v.name))) {
        v.addBinding(prog);
      }
    }
  }

  public get length(): number { return this._list.length; }

  private findSlot(variableSize: number, loopSize: number, registers: number[]): number {
    // Find the first available slot into which to insert this variable
    for (let i = 0; i < loopSize; i++) {
      const newSize = registers[i] + variableSize;
      if (newSize <= 4) {
        registers[i] = newSize;
        return i;
      }
    }
    return -1;
  }

  // Return string of varying types with their theoretical slot numbers
  public checkMaxVaryingVectors(fragSource: string): string {
    // Varyings go into a matrix of 4 columns and GL_MAX_VARYING_VECTORS rows of floats.
    // The packing rules are defined by the standard. Specifically each row can contain one of:
    //  vec4
    //  vec3 (+ float)
    //  vec2 (+ vec2)
    //  vec2 (+ float (+ float))
    //  float (+ float (+ float (+ float)))
    // Varyings are packed in order of size from largest to smallest
    const loopSize = 64;
    const registers = Array(loopSize + 1).fill(0);
    let outStr = "";
    let slot = 0;

    const varyings = this._list.filter((variable) => VariableScope.Varying === variable.scope);
    // Add in any built in vars that count as varyings if they are used
    if (fragSource.includes("gl_FragCoord")) {
      varyings.push(ShaderVariable.create("gl_FragCoord", VariableType.Vec4, VariableScope.Varying));
    }
    if (fragSource.includes("gl_PointCoord")) {
      varyings.push(ShaderVariable.create("gl_PointCoord", VariableType.Vec2, VariableScope.Varying));
    }
    if (fragSource.includes("gl_FrontFacing")) {
      varyings.push(ShaderVariable.create("gl_FrontFacing", VariableType.Boolean, VariableScope.Varying));
    }
    // Need to process in size order (largest first)
    varyings.sort((a, b) => b.type - a.type); // this is good enough to sort by

    for (const variable of varyings) {
      let variableSize = 0;
      switch (variable.type) {
        case VariableType.Boolean:
        case VariableType.Int:
        case VariableType.Float:
          variableSize = 1;
          break;
        case VariableType.Vec2:
          variableSize = 2;
          break;
        case VariableType.Vec3:
          variableSize = 3;
          break;
        case VariableType.Vec4:
          variableSize = 4;
          break;
        default:
          assert(false, "Invalid varying variable type");
          continue;
      }
      slot = this.findSlot(variableSize, loopSize, registers);
      outStr += "// varying slot " + slot + " " + Convert.typeToString(variable.type) + " " + variable.name + "\n";
    }
    const slotsUsed = registers.indexOf(0);
    registers.length = slotsUsed;
    outStr += "// Slots used: " + slotsUsed + "  [" + registers.toString() + "]\n";

    // debug output modes
    const outputAll = true;  // false just outputs varyings that use more than 8
    if (outputAll) {
      return outStr;
    } else {
      if (slotsUsed > 8)
        return outStr;
      else
        return "";
    }
  }

  // Return true if GL_MAX_VARYING_VECTORS has been exceeded for the minimum guaranteed value of 8.
  public exceedsMaxVaryingVectors(fragSource: string): boolean {
    // Varyings go into a matrix of 4 columns and GL_MAX_VARYING_VECTORS rows of floats.
    // The packing rules are defined by the standard. Specifically each row can contain one of:
    //  vec4
    //  vec3 (+ float)
    //  vec2 (+ vec2)
    //  vec2 (+ float (+ float))
    //  float (+ float (+ float (+ float)))
    // Varyings are packed in order of size from largest to smallest
    const loopSize = 64;
    const registers = Array(loopSize + 1).fill(0);

    const varyings = this._list.filter((variable) => VariableScope.Varying === variable.scope);
    // Add in any built in vars that count as varyings if they are used
    if (fragSource.includes("gl_FragCoord")) {
      varyings.push(ShaderVariable.create("gl_FragCoord", VariableType.Vec4, VariableScope.Varying));
    }
    if (fragSource.includes("gl_PointCoord")) {
      varyings.push(ShaderVariable.create("gl_PointCoord", VariableType.Vec2, VariableScope.Varying));
    }
    if (fragSource.includes("gl_FrontFacing")) {
      varyings.push(ShaderVariable.create("gl_FrontFacing", VariableType.Boolean, VariableScope.Varying));
    }
    // Need to process in size order (largest first)
    varyings.sort((a, b) => b.type - a.type); // this is good enough to sort by

    for (const variable of varyings) {
      if (VariableScope.Varying !== variable.scope)
        continue;

      let variableSize = 0;
      switch (variable.type) {
        case VariableType.Boolean:
        case VariableType.Int:
        case VariableType.Float:
          variableSize = 1;
          break;
        case VariableType.Vec2:
          variableSize = 2;
          break;
        case VariableType.Vec3:
          variableSize = 3;
          break;
        case VariableType.Vec4:
          variableSize = 4;
          break;
        default:
          assert(false, "Invalid varying variable type");
          continue;
      }

      this.findSlot(variableSize, loopSize, registers);
    }

    const slotsUsed = registers.indexOf(0);
    return slotsUsed > 8;
  }
}

/** Convenience API for assembling glsl source code.
 * @internal
 */
export class SourceBuilder {
  public source: string = "";

  /* Append the specified string to the glsl source */
  public add(what: string): void { this.source += what; }

  /* Append a new-line to the glsl source */
  public newline(): void { this.add("\n"); }

  /* Append the specified string to the glsl source, followed by a new-line */
  public addline(what: string): void { this.add(what); this.newline(); }

  /**
   * Construct a function definition given the function signature and body. For example:
   * buildFunctionDefintion("float average(float a, float b)", "\n  return (a + b) / 2.0;\n");
   * will produce:
   *  "float average(float a, float b) {
   *     return (a + b) / 2.0;
   *   }"
   * For an inline function:
   * buildFunctionDefintion("float average(float a, float b)", "return (a + b) / 2.0;");
   * will produce:
   *  "float average(float a, float b) { return (a + b) / 2.0; }"
   */
  public static buildFunctionDefinition(declaration: string, implementation: string): string {
    // If implementation does not start with a newline then assume it is an inline function & add spaces between braces.
    if ("\n" === implementation.charAt(0))
      return declaration + " {" + implementation + "}\n\n";
    else
      return declaration + " { " + implementation + " }\n\n";
  }

  /** Constructs a function definition as described by buildFunctionDefinition() and appends it to the glsl source. */
  public addFunction(declaration: string, implementation: string): void { this.add(SourceBuilder.buildFunctionDefinition(declaration, implementation)); }

  /** Constructs the definition of the main() function using the supplied function body and appends it to the glsl source. */
  public addMain(implementation: string): void { this.addFunction("void main()", implementation); }
}

/** @internal */
export const enum ShaderBuilderFlags {
  // No special flags. Vertex data comes from attributes, geometry is not instanced.
  None = 0,
  // Vertex data comes from a texture.
  VertexTable = 1 << 0,
  // Geometry is instanced.
  Instanced = 1 << 1,
  InstancedVertexTable = VertexTable | Instanced,
}

/*
 * Represents a fragment or vertex shader under construction. The shader consists of a set of defined variables,
 * plus a set of code snippets which can be concatenated together to form the shader source.
 * @internal
 */
export class ShaderBuilder extends ShaderVariables {
  protected _components = new Array<string | undefined>();
  protected _functions: string[] = [];
  protected _extensions: string[] = [];
  protected _macros: string[] = [];
  public headerComment: string = "";
  protected readonly _flags: ShaderBuilderFlags;
  protected _initializers: string[] = new Array<string>();

  public get usesVertexTable() { return ShaderBuilderFlags.None !== (this._flags & ShaderBuilderFlags.VertexTable); }
  public get usesInstancedGeometry() { return ShaderBuilderFlags.None !== (this._flags & ShaderBuilderFlags.Instanced); }

  public addInitializer(initializer: string): void {
    if (-1 === this._initializers.indexOf(initializer))
      this._initializers.push(initializer);
  }

  protected constructor(maxComponents: number, flags: ShaderBuilderFlags) {
    super();
    this._components.length = maxComponents;
    this._flags = flags;
    this.addMacro("#version 100");
    this.addDefine("TEXTURE", "texture2D");
    this.addDefine("TEXTURE_CUBE", "textureCube");
  }

  protected addComponent(index: number, component: string): void {
    assert(index < this._components.length);

    // assume if caller is replacing an existing component, they know what they're doing...
    this._components[index] = component;
  }
  protected removeComponent(index: number) {
    assert(index < this._components.length);
    this._components[index] = undefined;
  }

  protected getComponent(index: number): string | undefined {
    assert(index < this._components.length);
    return this._components[index];
  }

  public addFunction(declarationOrFull: string, implementation?: string): void {
    let def = declarationOrFull;
    if (undefined !== implementation) {
      def = SourceBuilder.buildFunctionDefinition("\n" + declarationOrFull, implementation);
    }

    if (undefined === this.findFunction(def)) {
      this._functions.push(def);
    }
  }

  public replaceFunction(existing: string, replacement: string): boolean {
    const index = this._functions.indexOf(existing);
    if (-1 !== index) {
      this._functions[index] = replacement;
    }

    assert(-1 !== index);
    return -1 !== index;
  }

  public findFunction(func: string): string | undefined {
    return this._functions.find((f: string | undefined) => f === func);
  }

  public addExtension(extName: string): void {
    if (-1 === this._extensions.indexOf(extName))
      this._extensions.push(extName);
  }

  public addMacro(macro: string): void {
    if (-1 === this._macros.indexOf(macro))
      this._macros.push(macro);
  }

  public addDefine(name: string, value: string): void {
    const macro = "#define " + name + " " + value;
    this.addMacro(macro);
  }

  protected buildPreludeCommon(attrMap: Map<string, AttributeDetails> | undefined): SourceBuilder {
    const src = new SourceBuilder();

    // Header comment
    src.newline();
    if ("" !== this.headerComment) {
      src.addline(this.headerComment);
      src.newline();
    }

    // Macros
    for (const macro of this._macros)
      src.addline(macro);

    // Extensions
    for (const ext of this._extensions)
      src.addline("#extension " + ext + " : enable");

    // Default precisions
    src.addline("precision highp float;");
    src.addline("precision highp int;");
    src.newline();

    // Variable declarations
    src.add(this.buildDeclarations());

    // Attribute declarations
    if (attrMap !== undefined) {
      attrMap.forEach((attr: AttributeDetails, key: string) => {
        src.addline("attribute " + Convert.typeToString(attr.type) + " " + key + ";");
      });
    }

    // Functions
    for (const func of this._functions) {
      src.add(func);
    }
    if (0 !== this._functions.length)
      src.newline();

    return src;
  }

  protected copyCommon(src: ShaderBuilder): void {
    this.headerComment = src.headerComment;
    this._initializers = [...src._initializers];
    this._components = [...src._components];
    this._functions = [...src._functions];
    this._extensions = [...src._extensions];
    this._list = [...src._list];
    this._macros = [...src._macros];
  }
}

/** Describes the optional and required components which can be assembled into complete
 * @internal
 */
export const enum VertexShaderComponent {
  // (Optional) Adjust the result of unquantizeVertexPosition().
  // vec4 adjustRawPosition(vec4 rawPosition)
  AdjustRawPosition,
  // (Optional) Return true to discard this vertex before evaluating feature overrides etc, given the model-space position.
  // bool checkForEarlyDiscard(vec4 rawPos)
  CheckForEarlyDiscard,
  // (Optional) Compute feature overrides like visibility, rgb, transparency, line weight.
  // void computeFeatureOverrides()
  ComputeFeatureOverrides,
  // (Optional) Compute material parameters.
  // void computeMaterial()
  ComputeMaterial,
  // (Optional) Compute the vertex's base color. Requires the program to have a `varying vec4 v_color`.
  // vec4 computeBaseColor()
  ComputeBaseColor,
  // (Optional - does nothing if ComputeBaseColor not specified) Apply material overrides to vertex color
  // vec4 applyMaterialColor(vec4 baseColor)
  ApplyMaterialColor,
  // (Optional - does nothing if ComputeBaseColor not specified) Apply feature overrides to vertex color
  // vec4 applyFeatureColor(vec4 baseColor)
  ApplyFeatureColor,
  // (Optional) Return true if this vertex should be "discarded" (is not visible)
  // bool checkForDiscard()
  // If this returns true, gl_Position will be set to 0; presumably related vertices will also do so, resulting in a degenerate triangle.
  // If this returns true, no further processing will be performed.
  CheckForDiscard,
  // (Required) Return this vertex's position in clip space.
  // vec4 computePosition(vec4 rawPos)
  ComputePosition,
  // (Optional) After all output (varying) values have been computed, return true if this vertex should be discarded.
  // bool checkForLateDiscard()
  CheckForLateDiscard,
  // (Optional) Adjust the final position
  // vec4 adjustPosition(vec4 pos)
  FinalizePosition,

  COUNT,
}

/** Assembles the source code for a vertex shader from a set of modular components.
 * @internal
 */
export class VertexShaderBuilder extends ShaderBuilder {
  private _computedVarying: string[] = new Array<string>();

  private buildPrelude(attrMap?: Map<string, AttributeDetails>): SourceBuilder { return this.buildPreludeCommon(attrMap); }

  public constructor(flags: ShaderBuilderFlags) {
    super(VertexShaderComponent.COUNT, flags);

    this.addDefine("MAT_NORM", "g_nmx");
    if (this.usesInstancedGeometry) {
      addInstancedModelMatrixRTC(this);
      this.addDefine("MAT_MV", "g_mv");
      this.addDefine("MAT_MVP", "g_mvp");
      this.addDefine("MAT_MODEL", "g_instancedModelMatrix");
    } else {
      this.addDefine("MAT_MV", "u_mv");
      this.addDefine("MAT_MVP", "u_mvp");
      this.addDefine("MAT_MODEL", "u_modelMatrix");
    }

    addPosition(this, this.usesVertexTable);

  }

  public get(id: VertexShaderComponent): string | undefined { return this.getComponent(id); }
  public set(id: VertexShaderComponent, component: string) { this.addComponent(id, component); }
  public unset(id: VertexShaderComponent) { this.removeComponent(id); }

  public addComputedVarying(name: string, type: VariableType, computation: string): void {
    this.addVarying(name, type);
    this._computedVarying.push(computation);
  }

  public buildSource(attrMap?: Map<string, AttributeDetails>): string {
    const prelude = this.buildPrelude(attrMap);
    const main = new SourceBuilder();
    main.newline();

    const computePosition = this.get(VertexShaderComponent.ComputePosition);
    assert(undefined !== computePosition);
    if (undefined !== computePosition) {
      prelude.addFunction("vec4 computePosition(vec4 rawPos)", computePosition);
    }

    // Initialization logic that should occur at start of main() - primarily global variables whose values
    // are too complex to compute inline or which depend on uniforms and/or other globals.
    for (const init of this._initializers) {
      main.addline("  {" + init + "  }\n");
    }

    main.addline("  vec4 rawPosition = unquantizeVertexPosition(a_pos, u_qOrigin, u_qScale);");
    const adjustRawPosition = this.get(VertexShaderComponent.AdjustRawPosition);
    if (undefined !== adjustRawPosition) {
      prelude.addFunction("vec4 adjustRawPosition(vec4 rawPos)", adjustRawPosition);
      main.addline("  rawPosition = adjustRawPosition(rawPosition);");
    }

    const checkForEarlyDiscard = this.get(VertexShaderComponent.CheckForEarlyDiscard);
    if (undefined !== checkForEarlyDiscard) {
      prelude.addFunction("bool checkForEarlyDiscard(vec4 rawPos)", checkForEarlyDiscard);
      main.add(earlyVertexDiscard);
    }

    const computeFeatureOverrides = this.get(VertexShaderComponent.ComputeFeatureOverrides);
    if (undefined !== computeFeatureOverrides) {
      prelude.addFunction("void computeFeatureOverrides()", computeFeatureOverrides);
      main.addline("  computeFeatureOverrides();");
    }

    const computeMaterial = this.get(VertexShaderComponent.ComputeMaterial);
    if (undefined !== computeMaterial) {
      prelude.addFunction("void computeMaterial()", computeMaterial);
      main.addline("  computeMaterial();");
    }

    const computeBaseColor = this.get(VertexShaderComponent.ComputeBaseColor);
    if (undefined !== computeBaseColor) {
      assert(undefined !== this.find("v_color"));
      prelude.addFunction("vec4 computeBaseColor()", computeBaseColor);
      main.addline("vec4 baseColor = computeBaseColor();");

      const applyMaterialColor = this.get(VertexShaderComponent.ApplyMaterialColor);
      if (undefined !== applyMaterialColor) {
        prelude.addFunction("vec4 applyMaterialColor(vec4 baseColor)", applyMaterialColor);
        main.addline("baseColor = applyMaterialColor(baseColor);");
      }

      const applyFeatureColor = this.get(VertexShaderComponent.ApplyFeatureColor);
      if (undefined !== applyFeatureColor) {
        prelude.addFunction("vec4 applyFeatureColor(vec4 baseColor)", applyFeatureColor);
        main.addline("baseColor = applyFeatureColor(baseColor);");
      }

      main.addline("v_color = baseColor;");
    }

    const checkForDiscard = this.get(VertexShaderComponent.CheckForDiscard);
    if (undefined !== checkForDiscard) {
      prelude.addFunction("bool checkForDiscard()", checkForDiscard);
      main.add(vertexDiscard);
    }

    main.addline("  gl_Position = computePosition(rawPosition);");

    const finalizePos = this.get(VertexShaderComponent.FinalizePosition);
    if (undefined !== finalizePos) {
      prelude.addFunction("vec4 finalizePosition(vec4 pos)", finalizePos);
      main.addline("  gl_Position = finalizePosition(gl_Position);");
    }

    for (const comp of this._computedVarying) {
      main.addline("  " + comp);
    }

    const checkForLateDiscard = this.get(VertexShaderComponent.CheckForLateDiscard);
    if (undefined !== checkForLateDiscard) {
      prelude.addFunction("bool checkForLateDiscard()", checkForLateDiscard);
      main.addline(lateVertexDiscard);
    }

    prelude.addMain(main.source);
    return prelude.source;
  }

  public copyFrom(src: VertexShaderBuilder): void {
    this.copyCommon(src);
    this._computedVarying = [...src._computedVarying];
  }
}

/** Describes the optional and required components which can be assembled into complete
 * @internal
 */
export const enum FragmentShaderComponent {
  // (Optional) Return true to immediately discard this fragment.
  // bool checkForEarlyDiscard()
  CheckForEarlyDiscard,
  // (Required) Compute this fragment's base color
  // vec4 computeBaseColor()
  ComputeBaseColor,
  // (Optional) Apply material overrides to base color
  // vec4 applyMaterialOverrides(vec4 baseColor)
  ApplyMaterialOverrides,
  // (Optional) Adjust base color after material and/or feature overrides have been applied.
  // vec4 finalizeBaseColor(vec4 baseColor)
  FinalizeBaseColor,
  // (Optional) Return true if this fragment should be discarded
  // Do not invoke discard directly in your shader components - instead, return true from this function to generate a discard statement.
  // bool checkForDiscard(vec4 baseColor)
  CheckForDiscard,
  // (Optional) Return true if the alpha value is not suitable for the current render pass
  // bool discardByAlpha(float alpha)
  DiscardByAlpha,
  // (Optional) Apply lighting to base color
  // vec4 applyLighting(vec4 baseColor)
  ApplyLighting,
  // (Optional) Apply monochrome overrides to base color
  // vec4 applyMonochrome(vec4 baseColor)
  ApplyMonochrome,
  // (Optional) Apply white-on-white reversal to base color
  ReverseWhiteOnWhite,
  // (Optional) Discard if outside any clipping planes
  // void applyClipping()
  ApplyClipping,
  // (Optional) Apply flash hilite to lit base color
  // vec4 applyFlash(vec4 baseColor)
  ApplyFlash,
  // (Optional) Apply planar classifier.
  // vec4 applyPlanarClassification(vec4)
  ApplyPlanarClassifier,
  // (Optional) Apply solar shadow map.
  // vec4 applySolarShadowMap(vec4)
  ApplySolarShadowMap,
  // (Optional) Apply a debug color
  // vec4 applyDebugColor(vec4 baseColor)
  ApplyDebugColor,
  // (Required) Assign the final color to gl_FragColor or gl_FragData
  // void assignFragData(vec4 baseColor)
  AssignFragData,
  // (Optional) Override current featureId
  // vec4 overrideFeatureId(vec4 currentId)
  OverrideFeatureId,
  // (Optional) Override fragment depth
  // float finalizeDepth()
  FinalizeDepth,
  // (Optional) Override fragment color. This is invoked just after alpha is multiplied, and just before FragColor is assigned.
  // vec4 overrideColor(vec4 currentColor)
  OverrideColor,
  COUNT,
}

/** Assembles the source code for a fragment shader from a set of modular components.
 * @internal
 */
export class FragmentShaderBuilder extends ShaderBuilder {
  private _maxClippingPlanes = 0;
  public get maxClippingPlanes() { return this._maxClippingPlanes; }
  public set maxClippingPlanes(max: number) {
    if (max === this._maxClippingPlanes)
      return;

    this._maxClippingPlanes = max;
    const macroIndex = this._macros.findIndex((x) => x.startsWith("#define MAX_CLIPPING_PLANES"));
    if (-1 !== macroIndex)
      this._macros[macroIndex] = "#define MAX_CLIPPING_PLANES " + max;
    else
      this.addDefine("MAX_CLIPPING_PLANES", max.toString());
  }

  public constructor(flags: ShaderBuilderFlags) {
    super(FragmentShaderComponent.COUNT, flags);

    this.addDefine("FragColor", "gl_FragColor");
  }

  public get(id: FragmentShaderComponent): string | undefined { return this.getComponent(id); }
  public set(id: FragmentShaderComponent, component: string) { this.addComponent(id, component); }
  public unset(id: FragmentShaderComponent) { this.removeComponent(id); }

  public addDrawBuffersExtension(): void {
    assert(System.instance.capabilities.supportsDrawBuffers, "WEBGL_draw_buffers unsupported");
    this.addExtension("GL_EXT_draw_buffers");
    for (let i = 0; i < 4; i++)
      this.addDefine("FragColor" + i, "gl_FragData[" + i + "]");
  }

  public buildSource(): string {
    const applyLighting = this.get(FragmentShaderComponent.ApplyLighting);
    const prelude = this.buildPrelude(undefined);

    const computeBaseColor = this.get(FragmentShaderComponent.ComputeBaseColor);
    assert(undefined !== computeBaseColor);
    if (undefined !== computeBaseColor) {
      prelude.addFunction("vec4 computeBaseColor()", computeBaseColor);
    }

    const main = new SourceBuilder();
    main.newline();

    // Initialization logic that should occur at start of main() - primarily global variables whose values
    // are too complex to compute inline or which depend on uniforms and/or other globals.
    for (const init of this._initializers) {
      main.addline("  {" + init + "  }\n");
    }

    const checkForEarlyDiscard = this.get(FragmentShaderComponent.CheckForEarlyDiscard);
    if (undefined !== checkForEarlyDiscard) {
      prelude.addFunction("bool checkForEarlyDiscard()", checkForEarlyDiscard);
      main.addline("  if (checkForEarlyDiscard()) { discard; return; }");
    }

    const applyClipping = this.get(FragmentShaderComponent.ApplyClipping);
    if (undefined !== applyClipping) {
      prelude.addFunction("void applyClipping()", applyClipping);
      main.addline("  applyClipping();");
    }

    main.addline("  vec4 baseColor = computeBaseColor();");

    const applyMaterialOverrides = this.get(FragmentShaderComponent.ApplyMaterialOverrides);
    if (undefined !== applyMaterialOverrides) {
      prelude.addFunction("vec4 applyMaterialOverrides(vec4 baseColor)", applyMaterialOverrides);
      main.addline("  baseColor = applyMaterialOverrides(baseColor);");
    }

    const finalizeDepth = this.get(FragmentShaderComponent.FinalizeDepth);
    if (undefined !== finalizeDepth) {
      prelude.addFunction("float finalizeDepth()", finalizeDepth);
      main.addline("  float finalDepth = finalizeDepth();");
      main.addline("  gl_FragDepthEXT = finalDepth;");
    }

    const applyPlanarClassifier = this.get(FragmentShaderComponent.ApplyPlanarClassifier);
    if (undefined !== applyPlanarClassifier) {
      if (undefined === finalizeDepth) {
        if (this.findFunction(volClassOpaqueColor))
          main.addline("  float finalDepth = gl_FragCoord.z;");
        else
          main.addline("  float finalDepth = 1.0;");
      }
      prelude.addFunction("vec4 applyPlanarClassifications(vec4 baseColor, float depth)", applyPlanarClassifier);
      main.addline("  baseColor = applyPlanarClassifications(baseColor, finalDepth);");
    }
    const applySolarShadowMap = this.get(FragmentShaderComponent.ApplySolarShadowMap);
    if (undefined !== applySolarShadowMap) {
      prelude.addFunction("vec4 applySolarShadowMap(vec4 baseColor)", applySolarShadowMap);
      main.addline("  baseColor = applySolarShadowMap(baseColor);");
    }
    const finalize = this.get(FragmentShaderComponent.FinalizeBaseColor);
    if (undefined !== finalize) {
      prelude.addFunction("vec4 finalizeBaseColor(vec4 baseColor)", finalize);
      main.addline("  baseColor = finalizeBaseColor(baseColor);");
    }

    const checkForDiscard = this.get(FragmentShaderComponent.CheckForDiscard);
    if (undefined !== checkForDiscard) {
      prelude.addFunction("bool checkForDiscard(vec4 baseColor)", checkForDiscard);
      main.addline("  if (checkForDiscard(baseColor)) { discard; return; }");
    }

    const discardByAlpha = this.get(FragmentShaderComponent.DiscardByAlpha);
    if (undefined !== discardByAlpha) {
      prelude.addFunction("bool discardByAlpha(float alpha)", discardByAlpha);
      main.addline("  if (discardByAlpha(baseColor.a)) { discard; return; }");
    }

    if (undefined !== applyLighting) {
      prelude.addFunction("vec4 applyLighting(vec4 baseColor)", applyLighting);
      main.addline("  baseColor = applyLighting(baseColor);");
    }

    const applyMonochrome = this.get(FragmentShaderComponent.ApplyMonochrome);
    if (undefined !== applyMonochrome) {
      prelude.addFunction("vec4 applyMonochrome(vec4 baseColor)", applyMonochrome);
      main.addline("  baseColor = applyMonochrome(baseColor);");
    }

    const reverseWoW = this.get(FragmentShaderComponent.ReverseWhiteOnWhite);
    if (undefined !== reverseWoW) {
      prelude.addFunction("vec4 reverseWhiteOnWhite(vec4 baseColor)", reverseWoW);
      main.addline("  baseColor = reverseWhiteOnWhite(baseColor);");
    }

    const applyFlash = this.get(FragmentShaderComponent.ApplyFlash);
    if (undefined !== applyFlash) {
      prelude.addFunction("vec4 applyFlash(vec4 baseColor)", applyFlash);
      main.addline("  baseColor = applyFlash(baseColor);");
    }

    const applyDebug = this.get(FragmentShaderComponent.ApplyDebugColor);
    if (undefined !== applyDebug) {
      prelude.addFunction("vec4 applyDebugColor(vec4 baseColor)", applyDebug);
      main.addline("  baseColor = applyDebugColor(baseColor);");
    }

    const assignFragData = this.get(FragmentShaderComponent.AssignFragData);
    assert(undefined !== assignFragData);
    if (undefined !== assignFragData) {
      prelude.addFunction("void assignFragData(vec4 baseColor)", assignFragData);
      main.addline("  assignFragData(baseColor);");
    }

    prelude.addMain(main.source);
    return prelude.source;
  }

  private buildPrelude(attrMap: Map<string, AttributeDetails> | undefined): SourceBuilder {
    return this.buildPreludeCommon(attrMap);
  }

  public copyFrom(src: FragmentShaderBuilder): void {
    this.copyCommon(src);
    this.maxClippingPlanes = src.maxClippingPlanes;
  }
}

/** A collection of shader programs with clipping that vary based on the max number of clipping planes each supports.
 * @internal
 */
export class ClippingShaders {
  public builder: ProgramBuilder;
  public shaders: ShaderProgram[] = [];
  public maskShader?: ShaderProgram;

  public constructor(prog: ProgramBuilder, context: WebGLRenderingContext, wantMask: boolean) {
    this.builder = prog.clone();
    addClipping(this.builder, ClipDef.forPlanes(6));

    if (wantMask) {
      const maskBuilder = prog.clone();
      addClipping(maskBuilder, ClipDef.forMask());
      this.maskShader = maskBuilder.buildProgram(context);
      assert(this.maskShader !== undefined);
    }
  }

  public compileShaders(): boolean {
    return undefined === this.maskShader || this.maskShader.compile();
  }

  private static roundUpToNearestMultipleOf(value: number, factor: number): number {
    const maxPlanes = Math.ceil(value / factor) * factor;
    assert(maxPlanes >= value);
    return maxPlanes;
  }

  private static roundNumPlanes(minPlanes: number): number {
    // We want to avoid making the shader do too much extra work, but we also want to avoid creating separate clipping shaders for
    // every unique # of planes
    if (minPlanes <= 2)
      return minPlanes;   // 1 or 2 planes fairly common (ex - section cut)
    else if (minPlanes <= 6)
      return 6;           // cuboid volume
    else if (minPlanes <= 120)
      return this.roundUpToNearestMultipleOf(minPlanes, 20);
    else
      return this.roundUpToNearestMultipleOf(minPlanes, 50);
  }

  public getProgram(clipDef: ClipDef): ShaderProgram | undefined {
    if (clipDef.type === ClippingType.Mask) {
      return this.maskShader;
    } else if (clipDef.type === ClippingType.Planes) {
      assert(clipDef.numberOfPlanes > 0);
      const numClips = ClippingShaders.roundNumPlanes(clipDef.numberOfPlanes);
      for (const shader of this.shaders)
        if (shader.maxClippingPlanes === numClips)
          return shader;

      this.builder.frag.maxClippingPlanes = numClips;
      const newProgram = this.builder.buildProgram(System.instance.context);
      this.shaders.push(newProgram);
      return newProgram;
    } else {
      assert(false);
      return undefined;
    }
  }
}

/** @internal */
export const enum ShaderType {
  Fragment = 1 << 0,
  Vertex = 1 << 1,
  Both = Fragment | Vertex,
}

/**
 * Assembles vertex and fragment shaders from a set of modular components to produce a compiled ShaderProgram.
 * Be very careful with components which use samplers to ensure that no conflicts exist with texture units used by other components (see TextureUnit enum).
 * @internal
 */
export class ProgramBuilder {
  public readonly vert: VertexShaderBuilder;
  public readonly frag: FragmentShaderBuilder;
  private readonly _flags: ShaderBuilderFlags;
  private readonly _attrMap?: Map<string, AttributeDetails>;

  public constructor(attrMap?: Map<string, AttributeDetails>, flags = ShaderBuilderFlags.None) {
    this._attrMap = attrMap;
    this.vert = new VertexShaderBuilder(flags);
    this.frag = new FragmentShaderBuilder(flags);
    this._flags = flags; // only needed for clone - though could loook up from vert or frag shader.
  }

  private addVariable(v: ShaderVariable, which: ShaderType) {
    if (which & ShaderType.Fragment) {
      this.frag.addVariable(v);
    }

    if (which & ShaderType.Vertex) {
      this.vert.addVariable(v);
    }
  }

  public addUniform(name: string, type: VariableType, binding: AddVariableBinding, which: ShaderType = ShaderType.Both) {
    this.addVariable(ShaderVariable.create(name, type, VariableScope.Uniform, binding), which);
  }
  public addVarying(name: string, type: VariableType) {
    this.addVariable(ShaderVariable.create(name, type, VariableScope.Varying), ShaderType.Both);
  }
  public addGlobal(name: string, type: VariableType, which: ShaderType = ShaderType.Both, value?: string, isConst: boolean = false) {
    this.addVariable(ShaderVariable.createGlobal(name, type, value, isConst), which);
  }

  public addInlineComputedVarying(name: string, type: VariableType, inlineComputation: string) {
    if (this.frag.addVarying(name, type))
      this.vert.addComputedVarying(name, type, inlineComputation);
  }
  public addFunctionComputedVarying(name: string, type: VariableType, funcName: string, funcBody: string) {
    let funcDecl = "\n" + Convert.typeToString(type) + " " + funcName + "()";
    funcDecl = SourceBuilder.buildFunctionDefinition(funcDecl, funcBody);

    const funcCall = funcName + "()";
    this.addFunctionComputedVaryingWithArgs(name, type, funcCall, funcDecl);
  }
  public addFunctionComputedVaryingWithArgs(name: string, type: VariableType, funcCall: string, funcDef: string) {
    this.vert.addFunction(funcDef);
    const computation = name + " = " + funcCall + ";";
    this.addInlineComputedVarying(name, type, computation);
  }

  /** Assembles the vertex and fragment shader code and returns a ready-to-compile shader program */
  public buildProgram(gl: WebGLRenderingContext): ShaderProgram {
    const vertSource = this.vert.buildSource(this._attrMap);
    const fragSource = this.frag.buildSource(); // NB: frag has no need to specify attributes, only vertex does.
    const checkMaxVarying = true;
    if (checkMaxVarying && this.vert.exceedsMaxVaryingVectors(fragSource))
      assert(false, "GL_MAX_VARYING_VECTORS exceeded");

    // Debug output
    const debugVaryings = false;
    if (debugVaryings) {
      const dbgLog = (x: string) => console.log(x); // tslint:disable-line:no-console
      const outSrc = false; // true for source out, false for just varying info
      if (this.frag.headerComment) {
        let tStr = "";
        if (!outSrc) {
          tStr = this.frag.headerComment + "\n";
        }
        const tStr2 = this.vert.checkMaxVaryingVectors(fragSource);
        if (tStr2) {
          if (outSrc) {
            dbgLog("//===============================================================================================================");
            dbgLog(vertSource);
            dbgLog("//========= Varying Info =========");
            dbgLog(tStr2);
            dbgLog(fragSource);
          } else {
            dbgLog(tStr + tStr2);
          }
        }
      }
    }

    const prog = new ShaderProgram(gl, vertSource, fragSource, this._attrMap, this.vert.headerComment, this.frag.maxClippingPlanes);
    this.vert.addBindings(prog);
    this.frag.addBindings(prog, this.vert);
    return prog;
  }

  public setDebugDescription(description: string): void {
    this.vert.headerComment = ("//!V! " + description);
    this.frag.headerComment = ("//!F! " + description);
  }

  /** Returns a deep copy of this program builder. */
  public clone(): ProgramBuilder {
    const clone = new ProgramBuilder(this._attrMap, this._flags);
    clone.vert.copyFrom(this.vert);
    clone.frag.copyFrom(this.frag);
    return clone;
  }
}
