import { describe, expect, it } from 'vitest'
import { fetchPublishedBuild, isUpdateAvailable, readBuildId } from './version'

function reply(body: string, type: string, status = 200): typeof fetch {
  return (async () => new Response(body, { status, headers: { 'content-type': type } })) as unknown as typeof fetch
}

describe('readBuildId', () => {
  it('reads a build id', () => {
    expect(readBuildId({ build: '20261126-abc' })).toBe('20261126-abc')
  })
  it('rejects anything unexpected', () => {
    for (const bad of [null, undefined, 'x', 7, [], {}, { build: 7 }, { build: '' }, { build: 'x'.repeat(65) }]) {
      expect(readBuildId(bad)).toBeNull()
    }
  })
})

describe('isUpdateAvailable', () => {
  it('is true only for a known, different build', () => {
    expect(isUpdateAvailable('a', 'b')).toBe(true)
    expect(isUpdateAvailable('a', 'a')).toBe(false)
    expect(isUpdateAvailable('a', null)).toBe(false)
  })
  it('never nags while developing', () => {
    expect(isUpdateAvailable('dev', 'b')).toBe(false)
  })
})

describe('fetchPublishedBuild', () => {
  it('returns the published build id', async () => {
    expect(await fetchPublishedBuild(reply('{"build":"b2"}', 'application/json'))).toBe('b2')
  })
  it('treats the app page being returned instead of the file as "no news"', async () => {
    // The host answers unknown addresses with the app's own page (status 200, HTML).
    expect(await fetchPublishedBuild(reply('<!doctype html><html></html>', 'text/html; charset=utf-8'))).toBeNull()
  })
  it('treats errors, bad files and being offline as "no news"', async () => {
    expect(await fetchPublishedBuild(reply('nope', 'application/json', 500))).toBeNull()
    expect(await fetchPublishedBuild(reply('not json', 'application/json'))).toBeNull()
    const offline = (async () => {
      throw new TypeError('Load failed')
    }) as unknown as typeof fetch
    expect(await fetchPublishedBuild(offline)).toBeNull()
  })
})
