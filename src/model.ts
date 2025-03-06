import { TZDate, tz } from "@date-fns/tz";
import { format } from "date-fns";
import type { IeyasuClient } from "./ieyasu";
import type { components } from "./lib/api/v1";

export function getStampLogsDaily(client: IeyasuClient, from: Date) {
	return client.GET("/stamp_logs/daily/{day}", {
		params: {
			path: {
				day: format(from, "yyyy-MM-dd", {
					in: tz("Asia/Tokyo"),
				}),
			},
			query: {
				from: from.toISOString(),
			},
		},
	});
}

type StampLog = components["schemas"]["StampLog"];
type StampLogWithUserName = StampLog & {
	user_name: string;
};

export async function resolveName(
	client: IeyasuClient,
	stampLog: StampLog,
): Promise<StampLogWithUserName> {
	const users = await client.GET("/users", {
		params: {
			query: {
				limit: 100,
			},
		},
		cf: {
			// 1時間キャッシュする
			cacheTtl: 60 * 60,
		},
	});

	if (users.error) {
		throw new Error("Failed to get users", {
			cause: users.error,
		});
	}

	const user = users.data.find((user) => user.id === stampLog.user_id);
	if (!user) {
		throw new Error("User not found", {
			cause: stampLog.user_id,
		});
	}

	const userName = `${user.last_name} ${user.first_name}`;

	return {
		...stampLog,
		user_name: userName,
	};
}

const StampTypeToString: Record<number, string> = {
	1: "出勤",
	2: "退勤",
	7: "休憩開始",
	8: "休憩終了",
};

export function formatStampLog(stampLog: StampLogWithUserName) {
	const when = stampLog.created_at
		? format(new TZDate(stampLog.created_at), "HH:mm", {
				in: tz("Asia/Tokyo"),
			})
		: "不明な日付";

	const what = StampTypeToString[stampLog.stamp_type] ?? "不明な打刻区分";

	return `${stampLog.user_name}さんが${what}しました。時刻: ${when}`;
}
