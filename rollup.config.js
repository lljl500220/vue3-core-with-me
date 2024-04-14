import esbuild from 'rollup-plugin-esbuild' //用于处理ts文件
import {nodeResolve} from '@rollup/plugin-node-resolve' //用于处理第三方模块
// import commonjs from '@rollup/plugin-commonjs' //用于处理commonjs模块
import json from '@rollup/plugin-json' //用于处理json文件
import {dts} from 'rollup-plugin-dts' //用于生成d.ts文件
import terser from '@rollup/plugin-terser' //用于压缩代码
import polyfillNode from 'rollup-plugin-polyfill-node' //用于处理nodejs内置模块
import { fileURLToPath } from 'node:url' //用于处理文件路径
import { createRequire } from 'node:module' //用于创建require函数
import assert from 'node:assert/strict'
import path from "node:path"; //用于处理文件路径

/**
 * @template T
 * @template {keyof T} K
 * @typedef { Omit<T, K> & Required<Pick<T, K>> } MarkRequired
 */
/** @typedef {'cjs' | 'esm-bundler' | 'global' | 'global-runtime' | 'esm-browser' | 'esm-bundler-runtime' | 'esm-browser-runtime'} PackageFormat */
/** @typedef {MarkRequired<import('rollup').OutputOptions, 'file' | 'format'>} OutputOptions */

// 如果命令行参数中没有指定目标，则抛出错误
if (!process.env.TARGET) {
    throw new Error('必须选择一个目标')
}

const require = createRequire(import.meta.url) //创建require函数
const __dirname = fileURLToPath(new URL('.', import.meta.url)) //获取当前文件所在目录的绝对路径

const masterVersion = require('./package.json').version //获取主版本号

const packagesDir = path.resolve(__dirname, 'packages') //获取packages目录的绝对路径
const packageDir = path.resolve(packagesDir, process.env.TARGET) //获取目标包的绝对路径

const resolve = (/** @type {string} */ p) => path.resolve(packageDir, p) //获取目标包内的文件的绝对路径
const pkg = require(`${packageDir}/package.json`) //获取目标包的package.json
const packageOptions = pkg.buildOptions || {} //获取目标包的构建选项
const name = packageOptions.filename || path.basename(packageDir) //获取目标包的名称

/** @type {Record<PackageFormat, OutputOptions>} */
const outputConfigs = { //
    'esm-bundler': {
        file: resolve(`dist/${name}.esm-bundler.js`),  //esm-bundler适用于 bundlers（例如 webpack、Rollup）的 ES module 包
        format: 'es',
    },
    'esm-browser': {
        file: resolve(`dist/${name}.esm-browser.js`), //浏览器环境下的esm格式
        format: 'es',
    },
    cjs: {
        file: resolve(`dist/${name}.cjs.js`), // commonjs格式
        format: 'cjs',
    },
    global: {
        file: resolve(`dist/${name}.global.js`), //浏览器环境下的全局变量格式
        format: 'iife',
    },
    //仅用于主要的“vue”包 包含了模板编译器 用于运行时
    'esm-bundler-runtime': {
        file: resolve(`dist/${name}.runtime.esm-bundler.js`), //bundler环境下的runtime格式
        format: 'es',
    },
    'esm-browser-runtime': {
        file: resolve(`dist/${name}.runtime.esm-browser.js`), //浏览器环境下的runtime格式
        format: 'es',
    },
    'global-runtime': {
        file: resolve(`dist/${name}.runtime.global.js`),
        format: 'iife',
    },
}

/** @type {ReadonlyArray<PackageFormat>} */
const defaultFormats = ['esm-bundler', 'cjs'] //默认的打包格式，包含commonjs以及esm
/** @type {ReadonlyArray<PackageFormat>} */
const inlineFormats = /** @type {any} */ ( //命令行参数中的打包格式
    process.env.FORMATS && process.env.FORMATS.split(',')
)

/** @type {ReadonlyArray<PackageFormat>} */
const packageFormats = inlineFormats || packageOptions.formats || defaultFormats //打包格式
const packageConfigs = process.env.PROD_ONLY //是否只打包生产环境
    ? []
    : packageFormats.map(format => createConfig(format, outputConfigs[format]))

if (process.env.NODE_ENV === 'production') { //如果是生产环境
    packageFormats.forEach(format => {
        if (packageOptions.prod === false) {
            return
        }
        if (format === 'cjs') { //生产环境下的commonjs格式
            packageConfigs.push(createProductionConfig(format))
        }
        if (/^(global|esm-browser)(-runtime)?/.test(format)) { //生产环境下的浏览器环境下的全局变量格式
            packageConfigs.push(createMinifiedConfig(format))
        }
    })
}


function createConfig (format,config) {

}

