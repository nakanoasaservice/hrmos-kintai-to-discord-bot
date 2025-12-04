import { getUnixTime } from "date-fns";
import originalCreateClient, {
	type Client,
	type Middleware,
} from "openapi-fetch";
import * as v from "valibot";
import type { components, paths } from "./lib/api/v1";

export type IeyasuClient = Client<paths>;

export function createIeyasuClient(
	companyName: CompanyName,
	kv: KVNamespace,
	apiKey: ApiKey,
) {
	const baseUrl = createBaseUrl(companyName);

	const client = originalCreateClient<paths>({ baseUrl });
	client.use(createAuthMiddleware(baseUrl, kv, apiKey));

	return client;
}

export const CompanyNameSchema = v.pipe(v.string(), v.brand("CompanyName"));
type CompanyName = v.InferOutput<typeof CompanyNameSchema>;

export const ApiKeySchema = v.pipe(v.string(), v.brand("ApiKey"));
type ApiKey = v.InferOutput<typeof ApiKeySchema>;

export const BaseUrlSchema = v.pipe(v.string(), v.brand("BaseUrl"));
type BaseUrl = v.InferOutput<typeof BaseUrlSchema>;

type TokenResponse = components["schemas"]["Token"];

function createBaseUrl(companyName: CompanyName) {
	return `https://ieyasu.co/api/${companyName}/v1` as BaseUrl;
}

async function getTokenFromCache(kv: KVNamespace) {
	const cache = await kv.get("token");
	if (!cache) {
		return;
	}

	return JSON.parse(cache) as TokenResponse;
}

async function setTokenToCache(kv: KVNamespace, token: TokenResponse) {
	await kv.put("token", JSON.stringify(token), {
		expiration: getUnixTime(new Date(token.expired_at)),
	});
}

function needsPostponeToken(token: TokenResponse) {
	// 1時間前にtrueになる
	const now = new Date();
	const expiredAt = new Date(token.expired_at);

	return expiredAt.getTime() - now.getTime() < 60 * 60 * 1000;
}

async function resolveToken(
	client: IeyasuClient,
	kv: KVNamespace,
	apiKey: ApiKey,
): Promise<TokenResponse> {
	const token = await getTokenFromCache(kv);
	if (!token) {
		const newToken = await client.GET("/authentication/token", {
			headers: {
				Authorization: `Basic ${apiKey}`,
			},
		});
		if (newToken.error) {
			console.error(newToken.error);

			throw new Error("Failed to resolve token", {
				cause: newToken.error,
			});
		}

		await setTokenToCache(kv, newToken.data);

		return newToken.data;
	}

	if (needsPostponeToken(token)) {
		const newToken = await client.PUT("/authentication/postpone", {
			headers: {
				Authorization: `Token ${token.token}`,
			},
		});
		if (newToken.error) {
			console.error(newToken.error);

			throw new Error("Failed to postpone token", {
				cause: newToken.error,
			});
		}

		await setTokenToCache(kv, newToken.data);

		return newToken.data;
	}

	return token;
}

function createAuthMiddleware(
	baseUrl: BaseUrl,
	kv: KVNamespace,
	apiKey: ApiKey,
): Middleware {
	const client = originalCreateClient<paths>({ baseUrl });

	let token: TokenResponse;

	const middleware: Middleware = {
		async onRequest({ request }) {
			if (!token || needsPostponeToken(token)) {
				token = await resolveToken(client, kv, apiKey);
			}

			request.headers.set("Authorization", `Token ${token.token}`);
		},
	};

	return middleware;
}
