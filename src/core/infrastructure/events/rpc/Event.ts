import { logger, UniqueId, Event as BaseEvent, Channel } from '@/core';
import { setTimeout } from 'timers/promises';

export abstract class Event<T> extends BaseEvent<T> {
  readonly correlationId: string;

  constructor(payload: T) {
    super(payload);
    this.correlationId = this.uniqueId();
  }

  public setup(channel: Channel): void {
    channel.assertQueue(this.exclusiveQueue, { exclusive: true });
  }

  public publish<Response>(options = {}): Promise<Response> {
    logger.debug('Publish message %s', this.constructor.name);
    return new Promise(resolve => {
      const correlationId = this.correlationId;
      const handleMessage = async (msg: any) => {
        if (msg.properties.correlationId == correlationId) {
          const parsedMessage = this.parseMessage(msg);

          this.channel.removeListener('message', handleMessage);
          await this.close()

          resolve(parsedMessage as Response);
        }
      }

      this.channel.consume(this.exclusiveQueue, handleMessage, { noAck: true });

      this.channel.sendToQueue(this.queue, this.payload, Object.assign({
        correlationId: correlationId,
        replyTo: this.exclusiveQueue,
        deliveryMode: 2,
        persistent: true,
      }, options));
    });
  }

  get queue(): string {
    const queue: string[] = [];
    queue.push('Rmq');
    queue.push('rpc');
    queue.push(this.exchange);
    queue.push(this.topic);
    return queue.join('.');
  }

  get exclusiveQueue(): string {
    const executiveQueue: string[] = [];
    executiveQueue.push(this.constructor.name);
    executiveQueue.push(this.exchange);
    executiveQueue.push(this.topic);
    executiveQueue.push(this.correlationId);
    return executiveQueue.join('.');
  }

  protected uniqueId(): string {
    return String(new UniqueId);
  }

  protected parseMessage(msg: any) {
    const json = msg.content.toString();
    return JSON.parse(json);
  }

  protected async close(): Promise<any> {
    return await setTimeout(1000, async () => {
      if (this.channel) {
        this.channel.deleteQueue(this.exclusiveQueue).then(() => {
          logger.info('The response queue is cleared');
        }).catch((err) => {
          logger.error('Failed to delete queue: ', { msg: err.message });
        });

        await this.channel.close().catch((reason) => {
          logger.error('Failed to close rpc channel', { reason });
        });
      }
    });
  }
}
