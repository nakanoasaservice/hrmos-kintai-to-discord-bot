import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";
import * as v from "valibot";

export const DiscordWebhookUrlSchema = v.pipe(
	v.string(),
	v.brand("DiscordWebhookUrl"),
);
type DiscordWebhookUrl = v.InferOutput<typeof DiscordWebhookUrlSchema>;

export async function sendDiscordMessage(
	webhookUrl: DiscordWebhookUrl,
	message: RESTPostAPIChannelMessageJSONBody,
) {
	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(errorBody);

		throw new Error(`Discord API error`, { cause: errorBody });
	}

	return response;
}
