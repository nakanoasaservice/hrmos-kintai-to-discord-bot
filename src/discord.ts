import type { RESTPostAPIChannelMessageJSONBody } from "discord-api-types/v10";

interface DiscordErrorResponse {
	code: number;
	message: string;
}

export async function sendDiscordMessage(
	webhookUrl: string,
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
		const errorBody = (await response.json()) as DiscordErrorResponse;
		console.error(errorBody);

		throw new Error(
			`Discord API error: ${response.status} - ${errorBody.message}`,
		);
	}

	return response;
}
