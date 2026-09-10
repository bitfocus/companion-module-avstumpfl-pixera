#!/usr/bin/env node
/**
 * Local dev harness for the Pixera module.
 *
 * Runs the module outside of Companion so you can inspect actions/feedbacks and
 * fire them at a real Pixera without restarting Companion every time.
 *
 *   yarn dev                          overview of config, actions and feedbacks
 *   yarn dev check                    validate all definitions and dry-run every callback
 *   yarn dev show <action-id>         show the option fields of a single action
 *   yarn dev connect --host 10.0.0.5  connect to a live Pixera and stream the log
 *   yarn dev action <id> --host <ip> [--field=value ...]
 *
 * See the README for testing through Companion itself (dev folder + hot reload).
 */
import { readFileSync } from 'node:fs'
import { isIP } from 'node:net'

import Pixera from '../src/Pixera.js'
import config from '../src/config.js'
import actions from '../src/actions.js'
import feedbacks from '../src/feedbacks.js'

const LEVELS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' }
const DIM = '\x1b[90m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'

/**
 * Warn when this Node does not match the runtime Companion runs the module on.
 * Without this a stale shell session is silent: everything appears to work, but
 * you are testing against a different runtime than production.
 */
function checkNodeVersion() {
	const manifest = JSON.parse(readFileSync(new URL('../companion/manifest.json', import.meta.url), 'utf8'))
	const wanted = Number((manifest.runtime?.type ?? '').replace('node', ''))
	const running = Number(process.versions.node.split('.')[0])
	if (!wanted || wanted === running) return
	console.log(
		`${YELLOW}Warning${RESET}  running Node ${process.versions.node}, but Companion runs this module on node${wanted}.` +
			`\n         Open a new terminal or run 'exec zsh'; .node-version will switch to the right version.\n`
	)
}
checkNodeVersion()

function parseArgs(argv) {
	const positional = []
	const flags = {}
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]
		if (!arg.startsWith('--')) {
			positional.push(arg)
			continue
		}
		const [key, ...rest] = arg.slice(2).split('=')
		if (rest.length) {
			flags[key] = rest.join('=')
			continue
		}
		const next = argv[i + 1]
		if (next !== undefined && !next.startsWith('--')) {
			flags[key] = next
			i++
		} else {
			flags[key] = true
		}
	}
	return { positional, flags }
}

/**
 * Builds an instance that mimics enough of InstanceBase to run the module.
 * Mirrors what index.js does, but without the IPC layer to Companion.
 */
function createInstance({ quiet = false } = {}) {
	const self = {}
	const state = { actions: null, feedbacks: null, status: null, logs: [] }

	Object.assign(self, config, actions, feedbacks, {
		log(level, message) {
			state.logs.push({ level, message })
			if (!quiet) console.log(`${LEVELS[level] ?? ''}${level.padEnd(5)}${RESET} ${message}`)
		},
		updateStatus(status, message) {
			state.status = status
			if (!quiet) console.log(`${BOLD}status${RESET} ${status}${message ? ' - ' + message : ''}`)
		},
		setActionDefinitions(defs) {
			state.actions = defs
		},
		setFeedbackDefinitions(defs) {
			state.feedbacks = defs
		},
		checkFeedbacks() {},
		checkFeedbacksById() {},
		setVariableValues() {},
		setVariableDefinitions() {},
	})

	// initVariables() only runs on connect; seed the choices up front so
	// updateActions() also works without a connection.
	for (const key of [
		'LIVESYSTEMNAME', 'OUTPUTNAME', 'STUDIOCAMERANAME', 'PROJECTORNAME', 'RESOURCENAME',
		'RESOURCEFOLDERNAME', 'TIMELINENAME', 'SCREENNAME', 'CUENAME', 'FADELIST',
		'TIMELINEFEEDBACK', 'CUEHANDLE', 'SCREENHANDLE', 'TIMELINEHANDLE', 'RESOURCEHANDLE',
		'RESOURCEFOLDERHANDLE', 'PROJECTORHANDLE', 'STUDIOCAMERAHANDLE', 'OUTPUTHANDLE',
	]) self['CHOICES_' + key] = []
	self.CHOICES_LIVESYSTEMHANDLE = ''
	self.SELECTEDTIMELINES = []

	return { self, state }
}

/** Populates an instance with definitions without any network traffic. */
function loadOffline() {
	const { self, state } = createInstance({ quiet: true })
	self.pixera = { send: () => {}, sendParams: () => {} }
	self.updateActions()
	self.initFeedbacks()
	return { self, state }
}

function cmdList() {
	const { self, state } = loadOffline()
	console.log(`\n${BOLD}Config${RESET}`)
	for (const f of self.getConfigFields())
		console.log(`  ${(f.id ?? '').padEnd(14)} ${DIM}${f.type}${RESET}  ${f.label}`)

	console.log(`\n${BOLD}Actions (${Object.keys(state.actions).length})${RESET}`)
	for (const [id, def] of Object.entries(state.actions))
		console.log(`  ${id.padEnd(42)} ${DIM}${def.options.length} options${RESET}  ${def.name}`)

	console.log(`\n${BOLD}Feedbacks (${Object.keys(state.feedbacks).length})${RESET}`)
	for (const [id, def] of Object.entries(state.feedbacks))
		console.log(`  ${id.padEnd(42)} ${DIM}${def.type}${RESET}  ${def.name}`)
	console.log()
}

function cmdShow(actionId) {
	const { state } = loadOffline()
	const def = state.actions[actionId]
	if (!def) {
		console.error(`Unknown action: ${actionId}`)
		console.error(`Run 'yarn dev' for the list.`)
		process.exitCode = 1
		return
	}
	console.log(`\n${BOLD}${actionId}${RESET} - ${def.name}\n`)
	for (const f of def.options) {
		console.log(`  ${BOLD}${f.id}${RESET} ${DIM}(${f.type})${RESET}  ${f.label ?? ''}`)
		if (f.default !== undefined) console.log(`    default: ${JSON.stringify(f.default)}`)
		if (f.isVisibleExpression) console.log(`    visible when: ${f.isVisibleExpression}`)
		if (f.choices) console.log(`    choices: ${f.choices.map((c) => `${c.id}=${c.label}`).join(', ')}`)
	}
	console.log()
}

/** Validates the definitions against the requirements of module-base v2. */
async function cmdCheck() {
	const { self, state } = loadOffline()
	const problems = []

	const fieldIssues = (where, fields) => {
		const ids = new Set()
		for (const f of fields) {
			for (const [key, value] of Object.entries(f)) {
				// v2 serialises fields as JSON; functions do not survive the IPC boundary.
				if (typeof value === 'function')
					problems.push(`${where}.${f.id}: '${key}' is a function (v2 expects an expression string)`)
			}
			if (f.id !== undefined) {
				if (ids.has(f.id)) problems.push(`${where}: duplicate field id '${f.id}'`)
				ids.add(f.id)
			}
		}
		// references inside isVisibleExpression must exist and must not be auto-expression
		for (const f of fields) {
			for (const [, ref] of (f.isVisibleExpression ?? '').matchAll(/\$\(options:([\w$]+)\)/g)) {
				const target = fields.find((o) => o.id === ref)
				if (!target) problems.push(`${where}.${f.id}: isVisibleExpression references unknown field '${ref}'`)
				else if (!target.disableAutoExpression)
					problems.push(`${where}.${ref}: is referenced but is missing disableAutoExpression`)
			}
		}
	}

	fieldIssues('config', self.getConfigFields())
	for (const [id, def] of Object.entries(state.actions)) {
		if (!def.name) problems.push(`${id}: no name`)
		if (typeof def.callback !== 'function') problems.push(`${id}: no callback`)
		if (!Array.isArray(def.options)) problems.push(`${id}: options is not an array`)
		else fieldIssues(id, def.options)
	}
	for (const [id, def] of Object.entries(state.feedbacks)) {
		if (!def.name) problems.push(`feedback ${id}: no name`)
		if (!Array.isArray(def.options)) problems.push(`feedback ${id}: options is not an array`)
		else fieldIssues('feedback ' + id, def.options)
	}

	// dry-run every callback with its own defaults
	let sends = 0
	self.pixera = { send: () => sends++, sendParams: () => sends++ }
	for (const [id, def] of Object.entries(state.actions)) {
		const options = {}
		for (const f of def.options) if (f.id !== undefined) options[f.id] = f.default
		try {
			await def.callback({ id: 'dev', controlId: 'dev', actionId: id, options }, {})
		} catch (err) {
			problems.push(`${id}: callback threw ${err.message}`)
		}
	}

	console.log(`\nconfig fields: ${self.getConfigFields().length}`)
	console.log(`actions: ${Object.keys(state.actions).length} (callbacks produced ${sends} commands)`)
	console.log(`feedbacks: ${Object.keys(state.feedbacks).length}`)
	if (problems.length === 0) {
		console.log(`\n${GREEN}No problems found.${RESET}\n`)
	} else {
		console.log(`\n${RED}${problems.length} problem(s):${RESET}`)
		for (const p of problems) console.log('  - ' + p)
		console.log()
		process.exitCode = 1
	}
}

/** Opens a real connection to a Pixera; Ctrl+C shuts down cleanly. */
function connect(flags) {
	const host = flags.host ?? process.env.PIXERA_HOST
	if (!host) {
		console.error('Provide a host: --host 10.0.0.5 (or set PIXERA_HOST)')
		process.exitCode = 1
		return null
	}
	if (isIP(host) !== 4) {
		console.error(`'${host}' is not a valid IPv4 address; the module will refuse to connect.`)
		process.exitCode = 1
		return null
	}
	const cfg = {
		host,
		port: Number(flags.port ?? process.env.PIXERA_PORT ?? 1400),
		polling: flags.polling === true || flags.polling === 'true',
		polling_rate: Number(flags['polling-rate'] ?? 50),
	}
	const { self, state } = createInstance()
	self.config = cfg
	console.log(`${DIM}connecting to ${cfg.host}:${cfg.port}${RESET}`)
	self.pixera = new Pixera(self, cfg)
	self.updateActions()

	const shutdown = () => {
		console.log(`\n${DIM}shutting down${RESET}`)
		self.pixera?.destroy()
		process.exit(0)
	}
	process.on('SIGINT', shutdown)
	return { self, state, shutdown }
}

function cmdConnect(flags) {
	const ctx = connect(flags)
	if (ctx) console.log(`${DIM}streaming the module log, Ctrl+C to stop${RESET}\n`)
}

function cmdAction(actionId, flags) {
	const { state } = loadOffline()
	const def = state.actions[actionId]
	if (!def) {
		console.error(`Unknown action: ${actionId}`)
		process.exitCode = 1
		return
	}
	const ctx = connect(flags)
	if (!ctx) return

	const options = {}
	for (const f of def.options) if (f.id !== undefined) options[f.id] = f.default
	for (const [k, v] of Object.entries(flags)) {
		if (['host', 'port', 'polling', 'polling-rate', 'wait'].includes(k)) continue
		options[k] = v === 'true' ? true : v === 'false' ? false : isNaN(Number(v)) ? v : Number(v)
	}

	// give the socket a moment to connect before firing the action
	setTimeout(async () => {
		console.log(`\n${BOLD}${actionId}${RESET} with ${JSON.stringify(options)}\n`)
		try {
			await ctx.self.updateActions()
			await state.actions[actionId].callback({ id: 'dev', controlId: 'dev', actionId, options }, {})
		} catch (err) {
			console.error(`action threw: ${err.message}`)
		}
		setTimeout(ctx.shutdown, 1500)
	}, Number(flags.wait ?? 1500))
}

const { positional, flags } = parseArgs(process.argv.slice(2))
const [command = 'list', arg] = positional

switch (command) {
	case 'list': cmdList(); break
	case 'check': await cmdCheck(); break
	case 'show': cmdShow(arg); break
	case 'connect': cmdConnect(flags); break
	case 'action': cmdAction(arg, flags); break
	default:
		console.error(`Unknown command: ${command}`)
		console.error('Usage: list | check | show <id> | connect | action <id>')
		process.exitCode = 1
}
