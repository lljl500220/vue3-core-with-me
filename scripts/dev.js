import fs from 'node:fs/promises'
import {existsSync, readdirSync, statSync} from "node:fs";
import path from 'node:path'
import {cpus} from "node:os"; // 获取cpu数量
import {execa} from "execa";
import {rollup} from "rollup";

const dirs = readdirSync('packages').filter(target => {
    return statSync(`packages/${target}`).isDirectory()
})

buildAll()

//打包 全部打包
async function buildAll() {
    await runParallel(cpus().length, dirs, build)
}


/**
 * 并行打包
 * @returns {Promise<Awaited<void>[]>} - 一个promise对象 代表打包过程
 * @param maxConcurrency
 * @param source
 * @param iteratorFn
 */
async function runParallel(maxConcurrency, source, iteratorFn) {
    /**@type {Promise<void>[]} */
    const ret = [] // 返回的promise数组 是用来描述所有任务的
    /**@type {Promise<void>[]} */
    const executing = [] // 正在执行的任务
    for (const item of source) {
        const p = Promise.resolve().then(() => iteratorFn(item)) // 调用iteratorFn函数 为什么要用Promise.resolve().then()包裹一层？ 因为iteratorFn函数可能是异步的，这样可以保证每个任务都是异步的
        ret.push(p)

        if (maxConcurrency <= source.length) { // 如果并发数小于任务数 则需要控制并发数
            const e = p.then(() => {
                executing.splice(executing.indexOf(e), 1) // 任务完成后，从执行列表中移除
            })
            executing.push(e) // 保存当前任务
            if (executing.length >= maxConcurrency) { // 如果当前执行的任务数大于等于最大并发数，则等待最快的任务完成
                await Promise.race(executing) // 等待最快的任务完成，然后继续执行
            }
        }
    }
    return Promise.all(ret) // 返回所有任务的promise数组
}

/**
 * 打包目标
 * @param target - 目标
 * @returns {Promise<void>} - 一个promise对象 代表打包过程
 */
async function build(target) {
    //获取到目标的绝对路径
    const pkgDir = path.resolve(`packages/${target}`)
    console.log(pkgDir)
    //获取到目标的package.json
    // const pkg = require(`${pkgDir}/package.json`)

    //按照官方的逻辑，如果是发布版本或者没有指定目标，则忽略私有包 此处我们不再关心这个问题
    // if ((isRelease || !targets.length) && pkg.private) {
    //      return
    // }

    //删除dist目录
    // await fs.rm(`${pkgDir}/dist`, { recursive: true })

    // 按照官方的逻辑，如果是特定格式的构建，则不要删除dist 此处我们不再关心格式这个问题
    if (existsSync(`${pkgDir}/dist`)) {
        await fs.rm(`${pkgDir}/dist`, { recursive: true })
    }

    //执行打包

    //获取环境变量 由于我们是学习目的，此处也不再考虑环境变量的问题，全部构建为生产环境
    // const env = (pkg.buildOptions && pkg.buildOptions.env) || (devOnly ? 'development' : 'production')

    const env = 'production'

    /**
     * Execa 是一个 Node.js 库，可以替代 Node.js 的原生 child_process 模块，
     * 用于执行外部命令。Execa拥有更好的性能、可靠性和易用性，支持流式传输、输出控制、交互式 shell 等功能，
     * 并跨平台兼容 Windows、macOS 和 Linux 等操作系统。同时，Execa 还支持 Promise API，提供更好的异步控制和异常处理机制。
     * 使用 Execa 可以简化发现和解决常见的子进程处理问题，是 Node.js 开发中非常有用的工具之一。
     */
    await execa(
        'rollup',
        [
            '-c',
            '--environment',
            [
                `NODE_ENV:${env}`,
                `TARGET:${target}`
            ]
                .filter(Boolean)
                .join(','),
        ],
        { stdio: 'inherit' }, // 将子进程的输出打印到父进程
    )
}