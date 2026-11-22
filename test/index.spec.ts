import {
	createExecutionContext,
	createScheduledController,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import worker from "../src/index";
import * as model from "../src/model";
import * as discord from "../src/discord";

vi.mock("../src/model", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/model")>()),
	getStampLogsDaily: vi.fn(),
	resolveName: vi.fn(),
}));
vi.mock("../src/discord", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/discord")>()),
	sendDiscordMessage: vi.fn(),
}));

const bindings = {
	...env,
	HRMOS_COMPANY_NAME: "test-company",
	HRMOS_API_KEY: "test-key",
	DISCORD_WEBHOOK_URL: "https://discord.example/webhook",
};
const scheduledTime = new Date("2026-11-22T00:10:00Z");
function runScheduled(overrides: Partial<Env> = {}) {
	return worker.scheduled(
		createScheduledController({ scheduledTime }),
		{ ...bindings, ...overrides },
		createExecutionContext(),
	);
}

describe("attendance notification schedule", () => {
	beforeEach(() => vi.resetAllMocks());

	it("rejects missing credentials before accessing the API", async () => {
		await expect(runScheduled({ HRMOS_API_KEY: undefined })).rejects.toThrow(
			"Invalid environment variables",
		);
		expect(model.getStampLogsDaily).not.toHaveBeenCalled();
		expect(discord.sendDiscordMessage).not.toHaveBeenCalled();
	});

	it("checks the previous five minutes without sending an empty message", async () => {
		vi.mocked(model.getStampLogsDaily).mockResolvedValue({
			data: [],
			response: new Response(),
		});
		await runScheduled();
		expect(model.getStampLogsDaily).toHaveBeenCalledWith(
			expect.anything(),
			new Date("2026-11-22T00:05:00Z"),
		);
		expect(discord.sendDiscordMessage).not.toHaveBeenCalled();
	});

	it("resolves employee names and sends the formatted attendance notification", async () => {
		const stamp = {
			user_id: 1,
			stamp_type: 1,
			created_at: "2026-11-22T00:06:00Z",
		};
		vi.mocked(model.getStampLogsDaily).mockResolvedValue({
			data: [stamp],
			response: new Response(),
		});
		vi.mocked(model.resolveName).mockResolvedValue({
			...stamp,
			user_name: "Test User",
		});
		await runScheduled();
		expect(model.resolveName).toHaveBeenCalledWith(expect.anything(), stamp);
		expect(discord.sendDiscordMessage).toHaveBeenCalledExactlyOnceWith(
			bindings.DISCORD_WEBHOOK_URL,
			{
				content: "Test Userさんが出勤しました。時刻: 09:06",
			},
		);
	});

	it("does not notify Discord when the attendance API fails", async () => {
		vi.mocked(model.getStampLogsDaily).mockResolvedValue({
			error: { code: 500, message: "Unavailable" },
			response: new Response(null, { status: 500 }),
		});
		await expect(runScheduled()).rejects.toThrow("Failed to get stamp logs");
		expect(discord.sendDiscordMessage).not.toHaveBeenCalled();
	});
});
