// @vitest-environment jsdom
// Сеть под вынос сетевого слоя «Онлайн» в useOnlineGame: с мок-WebSocket проверяем, что хук
// подключается (onopen → connected + watch), разбирает протокол (rooms/room/question) в состояние
// и что send уходит в сокет. api/звуки/стор замоканы.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

vi.mock("../components/tools/api.js", () => ({ default: { onlineSocketUrl: () => "ws://test" } }));
vi.mock("../components/tools/sound.js", () => ({ playSound: vi.fn(), playWin: vi.fn(), preloadSounds: vi.fn() }));
vi.mock("../components/tools/raceAudio.js", () => ({ startRaceMusic: vi.fn(), stopRaceMusic: vi.fn(), playGallop: vi.fn(), playFall: vi.fn() }));
vi.mock("../store/systemStore.jsx", () => ({ useSystemStore: Object.assign(() => {}, { getState: () => ({ showToast: vi.fn() }) }) }));

import { useOnlineGame } from "./useOnlineGame.js";

let lastWS;
class MockWS {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; lastWS = this; }
    send(d) { this.sent.push(d); }
    close() { this.readyState = 3; if (this.onclose) this.onclose(); }
    _open() { this.readyState = 1; if (this.onopen) this.onopen(); }
    _msg(o) { if (this.onmessage) this.onmessage({ data: JSON.stringify(o) }); }
}

beforeEach(() => { global.WebSocket = MockWS; });
afterEach(() => { cleanup(); });

describe("useOnlineGame", () => {
    it("подключается и шлёт watch при onopen", async () => {
        const { result } = renderHook(() => useOnlineGame("ru", {}));
        expect(result.current.connected).toBe(false);
        act(() => lastWS._open());
        await waitFor(() => expect(result.current.connected).toBe(true));
        expect(lastWS.sent).toContain(JSON.stringify({ type: "watch" }));
    });

    it("разбирает протокол rooms/room/question в состояние", async () => {
        const { result } = renderHook(() => useOnlineGame("ru", {}));
        act(() => lastWS._open());
        act(() => lastWS._msg({ type: "rooms", rooms: [{ id: "a" }, { id: "b" }] }));
        await waitFor(() => expect(result.current.rooms).toHaveLength(2));
        act(() => lastWS._msg({ type: "room", room: { id: "a", state: "lobby", players: [] } }));
        await waitFor(() => expect(result.current.room?.id).toBe("a"));
        act(() => lastWS._msg({ type: "question", i: 0, options: ["x", "y"] }));
        await waitFor(() => expect(result.current.question?.i).toBe(0));
    });

    it("send отправляет JSON в открытый сокет", async () => {
        const { result } = renderHook(() => useOnlineGame("ru", {}));
        act(() => lastWS._open());
        act(() => result.current.send({ type: "join", roomId: "a" }));
        expect(lastWS.sent).toContain(JSON.stringify({ type: "join", roomId: "a" }));
    });
});
