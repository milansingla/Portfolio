---
title: "Real-Time Doesn't Mean Instant: The Hidden Engineering Behind Live Applications"
slug: hidden-engineering-behind-real-time-applications
description: "A practical look at polling, WebSockets, SSE, ordering, reconnection, backpressure, and the distributed systems behind real-time applications."
publishedAt: 2026-11-16
author: Milan Singla
tags: [software-engineering, real-time-systems, distributed-systems, web-development, system-design]
published: true
---

Two people click Send. One sees the message immediately. The other sees it a moment later, perhaps after a reconnect, perhaps duplicated, perhaps not at all until the application is reopened.

The interface makes this look like one action. Behind it may be a browser connection, a load balancer, an application server, a message broker, a database write, a fan-out operation, and another unreliable network path. The message has to be accepted, persisted, delivered, rendered, and reconciled with whatever the second client already knows.

“Real-time” is the label users see. It is not a guarantee that every update is instant, reliable, ordered, or even delivered through the same path.

That distinction is easy to miss when a feature works with two browser tabs. It becomes impossible to ignore when thousands of clients connect, networks disappear, servers restart, and two people edit the same record at once.

## The real-time illusion

Most web applications begin with a simple request-response model:

1. The browser sends an HTTP request.
2. The server processes it.
3. The server sends a response.
4. The connection is finished.

This is a good default. It is stateless from the server's point of view, easy to cache, and straightforward to observe. A page can request the latest notifications when it loads, and a form can submit a new record when the user clicks Save.

The problem appears when the browser needs to learn that something changed without asking repeatedly. A chat message, presence indicator, collaborative edit, deployment log, or meeting participant event is not naturally a one-time request. It is a stream of state changes.

The common solutions are variations on a trade-off:

- **Polling** asks the server on a schedule.
- **Long polling** keeps an HTTP request open until there is something to return.
- **WebSockets** upgrade an HTTP connection into a persistent, bidirectional channel.
- **Server-Sent Events (SSE)** keep an HTTP response open for server-to-client events.

None of these choices turns an unreliable network into a reliable one. They only change how an application transports information. Reliability still requires application-level decisions about identifiers, persistence, acknowledgements, retries, deduplication, and recovery.

My [VRxED Meet engineering case study](/blog/building-vrxed-meet) made this boundary visible from another angle: a browser meeting client can react to participant events, but the client is not the whole meeting system. Real-time behaviour emerges from the contracts between the browser, provider, application state, and network.

## Polling is simple until it is not

The simplest implementation asks for updates every few seconds:

```ts
async function pollNotifications() {
  const response = await fetch("/api/notifications");
  const notifications = await response.json();
  renderNotifications(notifications);
}

setInterval(pollNotifications, 5_000);
```

Polling is easy to understand and often good enough for dashboards, low-frequency status pages, or a feature where a few seconds of delay is acceptable. Every request is independent, and ordinary HTTP infrastructure usually handles it without special configuration.

The inefficiency is that the client does not know whether anything changed. It sends requests when the server has no new information, and a shorter interval trades freshness for more requests. A longer interval reduces request volume but makes the interface feel stale.

Long polling improves the idle case by allowing the server to hold a request until an event is available or a timeout is reached. The client then receives a response and immediately opens another request. It still uses HTTP semantics, but the server and intermediary layers must manage many requests that spend most of their lifetime waiting.

Polling is not obsolete. It is a reasonable choice when updates are infrequent, infrastructure simplicity matters, or the client can tolerate bounded staleness. The mistake is treating it as free when the number of clients and polling frequency grow together.

## WebSockets are a transport, not a delivery guarantee

The [WebSocket protocol defined by RFC 6455](https://www.rfc-editor.org/rfc/rfc6455) begins with an HTTP Upgrade handshake and then uses framed messages over a persistent connection layered on TCP. The browser can send messages to the server, and the server can send messages back without waiting for a new HTTP request.

The browser API is intentionally small:

```ts
const socket = new WebSocket("wss://example.com/updates");

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "subscribe", roomId: "room-42" }));
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  applyEvent(message);
});

socket.addEventListener("close", () => {
  scheduleReconnect();
});
```

That open connection can make an application feel immediate, but the API does not tell the server to store a message for an offline client. It does not decide whether a message should be retried. It does not assign a business-level sequence number or resolve a conflict between two writes.

TCP provides ordered bytes within one connection. That is useful, but it is narrower than “all clients see the same events in the same order.” If two application servers publish events concurrently, the order in which different clients receive them depends on the system around the WebSocket. If a client disconnects, the connection's history does not automatically reappear when it reconnects.

There is another practical limitation: as [MDN notes, the browser WebSocket API does not provide backpressure](https://developer.mozilla.org/docs/Web/API/WebSockets_API). If messages arrive faster than the application can process them, buffering can consume memory or the client can become unresponsive. A persistent pipe still needs a policy for what happens when the receiver is slower than the sender.

## Socket.IO removes plumbing, not distributed-systems problems

[Socket.IO](https://socket.io/docs/v4/) provides an event-oriented layer with reconnection behaviour, fallbacks, rooms, acknowledgements, and a server/client programming model that is often more convenient than using the WebSocket API directly. Its features can make a real-time application easier to build and easier to explain.

But an event emitted by Socket.IO is not automatically a durable message in a database. A room is not automatically a security boundary. Reconnection is not the same as replaying every event missed while offline. Those guarantees depend on how the application persists state and what adapter or broker connects multiple server instances.

The useful mental model is:

```text
client event
    -> application validation
    -> durable state change
    -> published domain event
    -> connected-client fan-out
    -> client acknowledgement or reconciliation
```

If the server broadcasts before the database transaction commits, a client can see an update that later fails. If it commits first and crashes before publishing, the database contains a change that connected clients do not know about. The solution is not a clever socket callback; it is a deliberate event-publication design, often involving an outbox or a change-data-capture pipeline.

## SSE is a different kind of real-time

[Server-Sent Events use `EventSource` to keep an HTTP response open](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). The server sends text events to the browser, and the browser receives them as a stream. The channel is unidirectional: the server can push updates, but the client still uses ordinary HTTP requests to send commands.

That is a good fit for a news feed, build logs, notification stream, or server-driven progress display. The client-side API is compact:

```ts
const events = new EventSource("/api/deployments/events");

events.addEventListener("deployment-progress", (event) => {
  const update = JSON.parse(event.data);
  renderProgress(update);
});

events.onerror = () => {
  // The browser may reconnect, but the application still needs recovery logic.
  showConnectionState("reconnecting");
};
```

SSE avoids inventing a bidirectional protocol when the browser only needs to listen. WebSockets are more suitable when both sides need frequent messages over the same channel, such as interactive collaboration or a multiplayer session. Polling remains attractive when infrastructure and operational simplicity outweigh latency.

The right choice depends on message direction, update frequency, intermediary support, connection lifetime, authentication, and recovery requirements. “Real-time” is a product property; WebSockets, SSE, and polling are implementation choices.

## What happens when thousands of users connect?

With one process and a few users, connection state can sit in memory:

```text
server
  room-a -> socket 1, socket 2
  room-b -> socket 3
```

The server knows which sockets belong to each room and can broadcast to them. Add a load balancer and a second process, and the map splits:

```text
load balancer
       |
   +---+---+
   |       |
server A  server B
room-a    room-a
socket 1  socket 2
```

If a message arrives at server A, server A cannot reach socket 2 by looking only at its local memory. The servers need a shared event distribution mechanism, or the load balancer must route every relevant request and connection to the same process.

Sticky sessions can help with connection affinity, but they do not make a cluster one coherent process. They complicate failover, can create uneven load, and do not solve the question of how a server learns about an event handled elsewhere.

Socket.IO documents this scaling problem directly. Its [Redis adapter](https://socket.io/docs/v4/redis-adapter/) publishes packets so other Socket.IO servers can broadcast to their connected clients. The adapter is a transport between server instances; it is not automatically the durable record of application state.

Redis Pub/Sub is useful for live fan-out, but its [documented delivery semantic is at-most-once](https://redis.io/docs/latest/develop/pubsub/). If a subscriber is disconnected when a message is published, that message is lost for that subscriber. If an application needs persistence or replay, Redis's documentation points to Streams instead of Pub/Sub.

This distinction creates a useful split:

- **Live distribution:** get an event to currently connected clients.
- **Durable recovery:** let a reconnecting client discover what it missed.
- **Authoritative state:** determine what the data actually is now.

A production system may use all three, but they are different responsibilities.

## The hidden problems are not solved by an open socket

### Duplicate messages

Retries are necessary when acknowledgements are lost. A client may send a command, the server may commit it, and the response may disappear before reaching the client. The client retries, and the server receives the same command again.

An idempotency key lets the server recognise that the retry represents the same operation. The client can also deduplicate events by event ID. Without those boundaries, “retry until it works” can create duplicate payments, duplicate comments, or duplicate state transitions.

### Out-of-order events

Suppose a user changes a document title and then changes its visibility. Different network paths or server workers can deliver those events in an unexpected order. Rendering both blindly can leave the client with a state that never existed on the server.

Applications can attach versions, sequence numbers, or timestamps to events and reject stale updates. A client may also periodically fetch authoritative state instead of assuming that its local event stream is complete. The correct strategy depends on whether the domain needs total ordering, per-entity ordering, or only eventual convergence.

### Race conditions

Two users can edit the same row between a read and a write. A real-time notification makes the conflict visible, but it does not resolve it. The database may need optimistic concurrency control, compare-and-set updates, transactions, locks, or a domain-specific merge rule.

Collaborative editors often model changes as operations or document updates rather than broadcasting complete snapshots. A small chat application may choose a simpler last-write-wins policy. Neither is universally correct; the data model has to make the trade-off explicit.

### Reconnection and recovery

Networks fail silently. A laptop sleeps, a mobile device changes networks, a proxy closes an idle connection, or a server is restarted during a deployment. The interface may still look connected for a short time after the path has failed.

A robust client needs a connection state, a bounded reconnect strategy, and a recovery path. On reconnect, it should identify the last event it processed or refetch the current state. The server should authenticate the new connection again rather than trusting an old in-memory session forever.

Socket.IO's [connection-state-recovery feature](https://socket.io/docs/v4/connection-state-recovery) can help recover missed packets in supported configurations, but it is still a feature with compatibility and storage implications, not a universal replacement for durable application state.

### Backpressure

The sender may produce events faster than a client, broker, or downstream service can handle them. Broadcasting every intermediate cursor position to every participant may be wasteful. A deployment log may need to batch output. A presence indicator may tolerate coalescing.

Backpressure is a product decision as much as a transport decision:

- Which events must never be dropped?
- Which events can be collapsed into the latest state?
- Should a slow client be disconnected?
- Should the producer slow down?
- Is a queue allowed to grow without a limit?

If the system has no answer, memory becomes the implicit queue, and memory is a poor reliability strategy.

## The database is part of the real-time path

It is tempting to draw a WebSocket arrow directly from one browser to another. Most useful applications do not work that way. The server validates identity and permissions, updates durable state, and decides which clients should learn about the change.

That makes the database a participant in the timing and failure behaviour. A slow query can delay an event. A transaction can commit while a fan-out worker is unavailable. A database notification can tell a server that something changed without carrying enough context to render the correct state. A cache can make one client appear ahead of another.

The safest design usually treats events as notifications about an authoritative state transition, not as the state itself. An event might say:

```json
{
  "id": "event-1842",
  "type": "task.updated",
  "entityId": "task-7",
  "version": 12
}
```

The client can apply the change if it has enough information, or fetch the entity when it needs the complete representation. The event ID supports deduplication; the version supports stale-update detection. The exact fields depend on the domain, but the principle is stable: make recovery possible without trusting the transport to remember everything.

## Reliability means defining what “delivered” means

“The message was delivered” can mean several different things:

1. The server accepted the request.
2. The database committed the change.
3. The event entered a broker.
4. A particular server received the event.
5. A socket write completed.
6. The browser received the bytes.
7. The application rendered the update.
8. The user actually saw it.

These are not interchangeable. A green check mark in a chat interface may mean only that the server accepted the message. A read receipt is a separate application event. A video call's “connected” state may mean the signalling channel is open while media is degraded.

Good real-time systems make the important boundary visible. They define which operations are durable, which events are best effort, how clients recover, and what users see when the system cannot provide a stronger guarantee.

The [Google SRE guidance on handling overload](https://sre.google/sre-book/handling-overload/) is relevant here even though it is not specific to WebSockets. A system that accepts work faster than it can process it needs admission control, load shedding, prioritisation, or a graceful degraded mode. Keeping every connection technically open is not the same as keeping the service healthy.

## A practical design checklist

Before adding a live update channel, I would ask:

- What is the source of truth?
- Which actions need an idempotency key?
- Does every event have a stable ID and a version or ordering rule?
- What can a reconnecting client replay or refetch?
- Which messages may be dropped, coalesced, or delayed?
- What happens when the broker is unavailable?
- What happens when one client is slow?
- How are permissions checked on connect and on each command?
- Can a second server instance deliver events created by the first?
- What metrics show connection count, reconnect rate, queue depth, delivery latency, and failed sends?
- Can an operator distinguish “accepted,” “persisted,” “published,” and “rendered”?

The last questions matter because real-time failures are often partial. The database may be healthy while the fan-out worker is delayed. Connections may be open while events are stuck behind a congested queue. One region may be current while another is recovering.

## Real-time is a systems property

The most useful shift is to stop thinking of real-time as a frontend effect. The glowing notification, live cursor, and participant list are the visible end of a system that has to coordinate state, transport, storage, failure handling, and user expectations.

Polling, long polling, WebSockets, and SSE each solve a communication problem. Socket.IO can simplify the connection layer. Redis can distribute live events between instances. A load balancer can route connections. None of those components, by itself, decides what happens when an event is duplicated, reordered, dropped, or committed in the wrong place.

A real-time application is not one that updates quickly on the happy path. It is one that can explain what users should see when the network is slow, a server restarts, two writes race, a client reconnects, and the same event arrives twice.

Real-time does not mean instant. It means the system has chosen a latency target and built enough machinery to approach it without quietly abandoning correctness.

The difficult engineering question is not, “How do I make this update live?”

It is: **“What promise am I making about this update, and what will the system do when reality breaks that promise?”**

