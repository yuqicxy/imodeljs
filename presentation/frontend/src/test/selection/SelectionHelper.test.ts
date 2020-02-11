/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/* tslint:disable:no-direct-imports */

import { expect } from "chai";
import { SelectionHelper } from "../../presentation-frontend";
import { createRandomECInstanceNodeKey, createRandomECInstancesNodeKey, createRandomBaseNodeKey, createRandomECInstanceKey } from "@bentley/presentation-common/lib/test/_helpers/random";

describe("SelectionHelper", () => {

  describe("getKeysForSelection", () => {

    it("returns ECInstance key when ECInstance node key is provided", () => {
      const nodeKey = createRandomECInstanceNodeKey();
      const selectionKeys = SelectionHelper.getKeysForSelection([nodeKey]);
      expect(selectionKeys.length).to.eq(1);
      expect(selectionKeys[0]).to.deep.eq(nodeKey.instanceKey);
    });

    it("returns all ECInstance keys when ECInstances node key is provided", () => {
      const nodeKey = createRandomECInstancesNodeKey();
      const selectionKeys = SelectionHelper.getKeysForSelection([nodeKey]);
      expect(selectionKeys.length).to.eq(nodeKey.instanceKeys.length);
      expect(selectionKeys).to.deep.eq(nodeKey.instanceKeys);
    });

    it("returns node key when non-ECInstance node key is provided", () => {
      const nodeKey = createRandomBaseNodeKey();
      const selectionKeys = SelectionHelper.getKeysForSelection([nodeKey]);
      expect(selectionKeys.length).to.eq(1);
      expect(selectionKeys[0]).to.deep.eq(nodeKey);
    });

    it("returns key when ECInstance key is provided", () => {
      const key = createRandomECInstanceKey();
      const selectionKeys = SelectionHelper.getKeysForSelection([key]);
      expect(selectionKeys.length).to.eq(1);
      expect(selectionKeys[0]).to.deep.eq(key);
    });

  });

});
