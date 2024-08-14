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
	getAccessToken?(action: "pub" | "sub", channelName: keyof Channels): Promise<string>;
};

/**
 * @public
 */
export class Subscriber {
	static #baseUrl = process.env.BASE_URL;

	#projectId: string;
	#getAccessToken?: SubscriberOptions["getAccessToken"];

	constructor(projectId: string, options: SubscriberOptions = {}) {
		this.#projectId = projectId;
		this.#getAccessToken = options.getAccessToken;
	}

	/**
	 * @throws {SubscriberError}
	 */
	async publish<ChannelName extends keyof Channels>(
		channelName: ChannelName,
		body: Channels[ChannelName],
	): Promise<void> {
		if (this.#getAccessToken === undefined) {
			throw new Error("Cannot publish without an access token");
		}
		const accessToken = await this.#getAccessToken("sub", channelName);
		const response = await fetch(
			new URL(`${this.#projectId}/${encodeURIComponent(channelName)}`, Subscriber.#baseUrl),
			{
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					// biome-ignore lint/style/useNamingConvention: standard header name
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);
		if (!response.ok) {
			throw new SubscriberError(response.status, await response.text());
		}
	}

	async subscribe<ChannelName extends keyof Channels>(
		channelName: ChannelName,
		callback: (body: Channels[ChannelName]) => void,
		errorCallback?: (error: SubscriberError) => void,
	): Promise<() => void> {
		const accessToken = await this.#getAccessToken?.("sub", channelName);
		const eventSource = new EventSource(
			new URL(`${this.#projectId}/${encodeURIComponent(channelName)}`, Subscriber.#baseUrl).href,
			{
				headers: {
					"Content-Type": "application/json",
					// biome-ignore lint/style/useNamingConvention: standard header name
					Authorization: accessToken !== undefined ? `Bearer ${accessToken}` : undefined,
				},
			},
		);
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
