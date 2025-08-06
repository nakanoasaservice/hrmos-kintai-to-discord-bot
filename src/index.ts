import { subMinutes } from "date-fns";
import * as v from "valibot";
import { sendDiscordMessage } from "./discord";
import { createIeyasuClient } from "./ieyasu";
import { formatStampLog, getStampLogsDaily, resolveName } from "./model";

const EnvSchema = v.object({
	DISCORD_WEBHOOK_URL: v.string(),
	HRMOS_COMPANY_NAME: v.string(),
});

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		_ctx: ExecutionContext,
	) {
		const result = v.safeParse(EnvSchema, env);
		if (!result.success) {
			throw new Error("Invalid environment variables", {
				cause: result.issues,
			});
		}

		const client = createIeyasuClient(
			env.HRMOS_COMPANY_NAME,
			env.AUTH_TOKENS,
			env.HRMOS_API_TOKEN,
		);

		const stampLogs = await getStampLogsDaily(
			client,
			subMinutes(new Date(controller.scheduledTime), 5), // 5分前の打刻を取得
		);
		if (stampLogs.error) {
			console.error(stampLogs.error);
			throw new Error("Failed to get stamp logs", {
				cause: stampLogs.error,
			});
		}

		const stampLogsWithNames = await Promise.all(
			stampLogs.data.map((stampLog) => resolveName(client, stampLog)),
		);

		const messages = stampLogsWithNames.map(formatStampLog);

		if (messages.length === 0) {
			console.log("No stamp logs found");
			return;
		}

		await sendDiscordMessage(env.DISCORD_WEBHOOK_URL, {
			content: messages.join("\n"),
		});
	},
};
