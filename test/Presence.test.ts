import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { __setPlayersForTest } from "../src/db.js";
import { sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

describe("presence", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());
  afterEach(() => __setPlayersForTest(null));

  it("relays a bounded pose through the roster", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a", username: "A" });
    a.send("pose", { x: 12.5, y: 1, z: -40, yaw: 7, speed: 9999, steer: -3, car: "bull", air: true });
    await sleep(100);
    const p = room.state.players.get(a.sessionId)!;
    assert.strictEqual(p.x, 12.5);
    assert.strictEqual(p.z, -40);
    assert.ok(Math.abs(p.yaw) <= Math.PI);
    assert.strictEqual(p.speed, 500);
    assert.strictEqual(p.steer, -1);
    assert.strictEqual(p.car, "bull");
    assert.strictEqual(p.air, true);
    assert.strictEqual(p.spawned, true);
  });

  it("ignores malformed poses and bad car ids", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a" });
    a.send("pose", { x: "no", y: 0, z: 0 });
    a.send("pose", { x: 1, y: 2, z: 3, car: "Bad Id!" });
    await sleep(100);
    const p = room.state.players.get(a.sessionId)!;
    assert.strictEqual(p.x, 1);
    assert.strictEqual(p.car, "");
  });
});
