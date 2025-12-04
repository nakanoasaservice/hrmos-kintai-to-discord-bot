import { subMinutes } from "date-fns";
import * as v from "valibot";
import { DiscordWebhookUrlSchema, sendDiscordMessage } from "./discord";
import {
	CompanyNameSchema,
	createIeyasuClient,
	SecretKeySchema,
} from "./ieyasu";
import { formatStampLog, getStampLogsDaily, resolveName } from "./model";

const EnvSchema = v.object({
	DISCORD_WEBHOOK_URL: DiscordWebhookUrlSchema,
	HRMOS_COMPANY_NAME: CompanyNameSchema,
	HRMOS_API_TOKEN: SecretKeySchema,
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
			result.output.HRMOS_COMPANY_NAME,
			env.AUTH_TOKENS,
			result.output.HRMOS_API_TOKEN,
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

		await sendDiscordMessage(result.output.DISCORD_WEBHOOK_URL, {
			content: messages.join("\n"),
		});
	},
};
