import { randomBytes } from '@fuel-ts/crypto';
import { hexlify, sleep } from '@fuel-ts/utils';

import { ResourceCache } from './resource-cache';

/**
 * @group node
 * @group browser
 */
describe('Resource Cache', () => {
  const randomValue = () => hexlify(randomBytes(32));

  it('can instantiate [valid numerical ttl]', () => {
    const memCache = new ResourceCache(1000);

    expect(memCache.ttl).toEqual(1000);
  });

  it('can memCache [invalid numerical ttl]', () => {
    expect(() => new ResourceCache(-1)).toThrow(/Invalid TTL: -1. Use a value greater than zero./);
  });

  it('can memCache [invalid mistyped ttl]', () => {
    // @ts-expect-error intentional invalid input
    expect(() => new ResourceCache('bogus')).toThrow(
      /Invalid TTL: bogus. Use a value greater than zero./
    );
  });

  it('can validade if it is cached [UTXO]', () => {
    const resourceCache = new ResourceCache(1000);
    const utxoId = randomValue();

    expect(resourceCache.isCached(utxoId)).toBeFalsy();

    const txID = randomValue();
    resourceCache.set(txID, { utxos: [utxoId], messages: [] });

    expect(resourceCache.isCached(utxoId)).toBeTruthy();
  });

  it('can validade if it is cached [Message]', () => {
    const resourceCache = new ResourceCache(1000);
    const messageNonce = randomValue();

    expect(resourceCache.isCached(messageNonce)).toBeFalsy();

    const txID = randomValue();
    resourceCache.set(txID, { utxos: [], messages: [messageNonce] });

    expect(resourceCache.isCached(messageNonce)).toBeTruthy();
  });

  it('can get active [no data]', async () => {
    const EXPECTED = { utxos: [], messages: [] };
    const resourceCache = new ResourceCache(1);

    await sleep(1);

    expect(resourceCache.getActiveData()).toStrictEqual(EXPECTED);
  });

  it('can get active', () => {
    const EXPECTED = {
      utxos: [randomValue(), randomValue()],
      messages: [randomValue(), randomValue(), randomValue()],
    };
    const resourceCache = new ResourceCache(1000);

    const txId = randomValue();
    resourceCache.set(txId, EXPECTED);

    const activeData = resourceCache.getActiveData();

    expect(activeData.messages).containSubset(EXPECTED.messages);
    expect(activeData.utxos).containSubset(EXPECTED.utxos);
  });

  it('should remove expired when getting active data', async () => {
    const ttl = 1000;
    const resourceCache = new ResourceCache(ttl);

    const txId1 = randomValue();
    const txId1Resources = {
      utxos: [randomValue()],
      messages: [randomValue()],
    };

    resourceCache.set(txId1, txId1Resources);
    let activeData = resourceCache.getActiveData();

    expect(activeData.utxos).containSubset(txId1Resources.utxos);
    expect(activeData.messages).containSubset(txId1Resources.messages);

    await sleep(ttl);

    activeData = resourceCache.getActiveData();

    expect(activeData.utxos.length).toEqual(0);
    expect(activeData.messages.length).toEqual(0);
  });

  it('should remove cached data based on transaction ID', () => {
    const ttl = 1000;
    const resourceCache = new ResourceCache(ttl);

    const txId1 = randomValue();
    const txId2 = randomValue();

    const txId1Resources = {
      utxos: [randomValue()],
      messages: [randomValue(), randomValue()],
    };

    const txId2Resources = {
      utxos: [randomValue(), randomValue()],
      messages: [randomValue()],
    };

    resourceCache.set(txId1, txId1Resources);
    resourceCache.set(txId2, txId2Resources);

    let activeData = resourceCache.getActiveData();

    expect(activeData.utxos).containSubset([...txId1Resources.utxos, ...txId2Resources.utxos]);
    expect(activeData.messages).containSubset([
      ...txId1Resources.messages,
      ...txId2Resources.messages,
    ]);

    resourceCache.unset(txId1);

    activeData = resourceCache.getActiveData();

    expect(activeData.utxos).not.containSubset(txId1Resources.utxos);
    expect(activeData.messages).not.containSubset(txId1Resources.messages);

    expect(activeData.utxos).containSubset(txId2Resources.utxos);
    expect(activeData.messages).containSubset(txId2Resources.messages);
  });

  it('can clear cache', () => {
    const resourceCache = new ResourceCache(1000);

    const txId1 = randomValue();
    const txId2 = randomValue();

    const txId1Resources = {
      utxos: [randomValue()],
      messages: [randomValue(), randomValue()],
    };

    const txId2Resources = {
      utxos: [randomValue(), randomValue()],
      messages: [randomValue()],
    };

    resourceCache.set(txId1, txId1Resources);
    resourceCache.set(txId2, txId2Resources);

    const activeData = resourceCache.getActiveData();

    expect(activeData.utxos).containSubset([...txId1Resources.utxos, ...txId2Resources.utxos]);
    expect(activeData.messages).containSubset([
      ...txId1Resources.messages,
      ...txId2Resources.messages,
    ]);

    resourceCache.clear();

    expect(resourceCache.getActiveData()).toStrictEqual({ utxos: [], messages: [] });
  });

  it('should validate that ResourceCache uses a global cache', () => {
    const oldTxId = randomValue();
    const oldCache = {
      utxos: [randomValue(), randomValue()],
      messages: [randomValue()],
    };

    const oldInstance = new ResourceCache(800);
    oldInstance.set(oldTxId, oldCache);

    const newTxId = randomValue();
    const newCache = {
      utxos: [randomValue()],
      messages: [randomValue(), randomValue()],
    };

    const newInstance = new ResourceCache(300);
    newInstance.set(newTxId, newCache);

    const activeData = newInstance.getActiveData();

    expect(activeData.utxos).containSubset([...oldCache.utxos, ...newCache.utxos]);
    expect(activeData.messages).containSubset([...oldCache.messages, ...newCache.messages]);
  });
});
