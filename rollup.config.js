import {fileURLToPath} from 'node:url' //用于处理文件路径
import {createRequire} from 'node:module' //用于创建require函数
import path from "node:path";
import json from "@rollup/plugin-json"; //用于处理文件路径
import esbuild from 'rollup-plugin-esbuild' //用于处理文件路径

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
const outputConfigs = {
    'esm-bundler': {
        file: resolve(`dist/${name}.esm-bundler.js`),  //esm-bundler适用于 bundlers（例如 webpack、Rollup）的 ES module 包
        format: 'es',
    },
    'cjs': {
        file: resolve(`dist/${name}.cjs.js`), // commonjs格式
        format: 'cjs',
    },
}

/** @type {ReadonlyArray<PackageFormat>} */
const defaultFormats = ['esm-bundler', 'cjs'] //默认的打包格式，包含commonjs以及esm

//此处按照最新的vue打包配置来看，理应先判断是否有inlineFormats，如果有则使用inlineFormats，否则使用defaultFormats
//打包格式
//我们只关注生产模式，相当于只打生产包
const packageConfigs = defaultFormats.map(format => createConfig(format, outputConfigs[format]))


export default packageConfigs


function createConfig(format, output, plugins = []) {
    //返回一个rollup配置对象
    return {
        input: resolve('src/index.ts'), //入口文件 我们简易实现，仅保留'src/index.ts'这种情况，事实上还有运行时等其他情况
        output: output, //输出配置 其实就是outputConfigs[format] vue本身实现了相当多中格式输出，但是我们只保留了两种
        plugins: [
            json({
                namedExports: false
            }),
            esbuild({ //处理ts文件
                tsconfig: path.resolve(__dirname, 'tsconfig.json'),
                sourceMap: output.sourcemap,
                minify: false,
                target: 'es2015',
                define:{
                    version: `"${masterVersion}"`
                }
            }),
            ...plugins //其它有可能存在的插件
        ]
    }
}

