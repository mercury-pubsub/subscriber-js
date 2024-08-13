import type { Channels } from "@mercury-pubsub/types";
import EventSource from "eventsource";

/**
 * @public
 */
export class SubscriberError extends Error {
	status?: number;

	constructor(status?: number, message?: string) {
		super(message);
		this.status = status;
	}
}

/**
 * @public
 */
export type SubscriberOptions = {
	getAccessToken?(action: "pub" | "sub", channelId: keyof Channels): Promise<string>;
};

/**
 * @public
 */
export class Subscriber {
	static #baseUrl = process.env.BASE_URL;

	#getAccessToken?: SubscriberOptions["getAccessToken"];

	constructor({ getAccessToken }: SubscriberOptions = {}) {
		this.#getAccessToken = getAccessToken;
	}

	/**
	 * @throws {SubscriberError}
	 */
	async publish<ChannelId extends keyof Channels>(
		channelId: ChannelId,
		body: Channels[ChannelId],
	): Promise<void> {
		if (this.#getAccessToken === undefined) {
			throw new Error("Cannot publish without an access token");
		}
		const accessToken = await this.#getAccessToken("sub", channelId);
		const response = await fetch(new URL(channelId, Subscriber.#baseUrl), {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
				// biome-ignore lint/style/useNamingConvention: standard header name
				Authorization: `Bearer ${accessToken}`,
			},
		});
		if (!response.ok) {
			throw new SubscriberError(response.status, await response.text());
		}
	}

	async subscribe<ChannelId extends keyof Channels>(
		channelId: ChannelId,
		callback: (body: Channels[ChannelId]) => void,
		errorCallback?: (error: SubscriberError) => void,
	): Promise<() => void> {
		const accessToken = await this.#getAccessToken?.("sub", channelId);
		const eventSource = new EventSource(new URL(channelId, Subscriber.#baseUrl).href, {
			headers: {
				"Content-Type": "application/json",
				// biome-ignore lint/style/useNamingConvention: standard header name
				Authorization: accessToken !== undefined ? `Bearer ${accessToken}` : undefined,
			},
		});
		eventSource.onmessage = (messageEvent) => {
			callback(JSON.parse(messageEvent.data));
		};
		if (errorCallback !== undefined) {
			eventSource.onerror = (messageEvent) => {
				errorCallback(new SubscriberError(messageEvent.status, messageEvent.data));
			};
		}
		await new Promise((resolve) => {
			eventSource.onopen = resolve;
		});
		return eventSource.close.bind(eventSource);
	}
}
