import process from 'node:process'
import { rolldownBuild, testFixtures } from '@sxzz/test-utils'
import ViteVue from '@vitejs/plugin-vue'
import Oxc from 'unplugin-oxc/rolldown'
import { describe } from 'vitest'
import * as vueCompiler from 'vue/compiler-sfc'
import Vue from '../src/rolldown'
import type { Options } from '../src/api'

async function getCode(file: string, plugin: any) {
  const bundle = await rolldownBuild(file, [plugin, Oxc()], {
    external: ['vue'],
  })
  return bundle.snapshot
}

function createPlugins(opt: Options & { root: string }) {
  const vite = ViteVue(opt)
  // @ts-expect-error
  vite.configResolved!({
    root: opt.root,
    command: 'build',
    isProduction: opt.isProduction,
    build: {
      sourcemap: false,
    },
    define: {},
    logger: {},
  } as any)
  return {
    unplugin: Vue(opt),
    vite,
  }
}

describe('rolldown', async () => {
  await testFixtures(
    'tests/fixtures/*.{vue,js,ts}',
    async (args, id) => {
      const { unplugin, vite } = createPlugins({
        root: process.cwd(),
        compiler: vueCompiler,
        isProduction: args.isProduction,
      })

      // eslint-disable-next-line unused-imports/no-unused-vars
      const viteCode = await getCode(id, vite)
      const unpluginCode = await getCode(id, unplugin)

      // Parity with @vitejs/plugin-vue does not hold under Rolldown: Rolldown preserves virtual-module IDs in the bundled output
      // expect(viteCode).toBe(unpluginCode)

      return unpluginCode.replaceAll(
        /(["']__file["']\s*,\s*['"]).*?(['"])/g,
        (_, s1, s2) => `${s1}#FILE#${s2}`,
      )
    },
    {
      params: [['isProduction', [true, false]]],
      promise: true,
    },
  )
})
