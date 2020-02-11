/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import { IndexMap, compareNumbers } from "../bentleyjs-core";

describe("IndexMap", () => {
  it("Should remember insertion order", () => {
    const map = new IndexMap<number>(compareNumbers);
    const list = [ 9, 8, 7, 1, 2, 3, 0, 5, 4 ];
    for (let i = 0; i < list.length; i++)
      expect(map.insert(list[i])).to.equal(i);

    expect(map.length).to.equal(list.length);
    for (let i = 0; i < list.length; i++) {
      expect(map.indexOf(list[i])).to.equal(i);
      expect(map.insert(list[i])).to.equal(i);
    }

    expect(map.length).to.equal(list.length);
  });
});
