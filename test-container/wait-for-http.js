#!/usr/bin/env node

const { basename } = require('path')
const axios = require('axios')

const usage = `
Usage: node ${basename(process.argv[1])} <url> <interval in ms> [max retries]
`

async function retry(name, fn, intervalMs, maxRetries) {
    process.stdout.write(`Retrying ${name}`)
    let capturedError
    for (let tries = 0; tries < maxRetries; tries++) {
        try {
            const result = await fn()
            console.log(' success')
            return result
        } catch (err) {
            capturedError = err
            process.stdout.write('.')
            await sleep(intervalMs)
        }
    }
    console.log(' max retries exceeded, giving up')
    throw capturedError
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const parseArgs = () => {
    const [ url, intervalStr, maxRetriesStr ] = process.argv.slice(2)
    if (url === '--help') {
        die()
    }

    if (url === undefined) {
        die('Must provide URL')
    }

    if (intervalStr === undefined) {
        die('Must provide retry interval')
    }
    const intervalMs = parseInt(intervalStr, 10)
    if (Number.isNaN(intervalMs)) {
        die('Retry interval must be an integer')
    }
    const maxRetries = maxRetriesStr === undefined ? Infinity : parseInt(maxRetriesStr, 10)
    if (Number.isNaN(maxRetries)) {
        die('Max retries must be an integer or omitted')
    }

    return { url, intervalMs, maxRetries }
}

const die = (message) => {
    if (message !== undefined) {
        console.error(message)
    }
    console.error(usage)
    process.exit(1)
}


const main = async () => {
    const { url, intervalMs, maxRetries } = parseArgs()
    try {
        await retry(url, () => axios.get(url), intervalMs, maxRetries)
    } catch (_) {
        process.exit(1)
    }
}

main().catch(console.error)
