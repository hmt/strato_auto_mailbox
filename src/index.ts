import { Browser, firefox, Page } from "playwright";

import crypto from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
const Papa = require("papaparse");
const json_config = readFileSync(resolve(__dirname, "../config.json"), "utf8");
const config = JSON.parse(json_config);

type User = { name: string; kuerzel: string; old_mail: string; username: string; password: string; new_mail: string };

function generatePassword() {
	return Array(18)
		.fill("23456789ABCDEFGHKLMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz!#$%*+-/=?")
		.map(function (x) {
			return x[crypto.randomInt(0, 10_000) % x.length];
		})
		.join("");
}

function create_user(entry: Array<string>) {
	const user: User = {
		name: entry[0],
		kuerzel: entry[1],
		old_mail: entry[2],
		new_mail: entry[2].replace(/(?<=@)(\S*)/, config.new_domain),
		username: entry[2].replace(/@(\S*)/, ""),
		password: generatePassword()
	};
	return user;
}

async function start_script(): Promise<{ page: Page; browser: Browser }> {
	const browser = await firefox.launch({ headless: false });
	const page = await browser.newPage();
	await page.goto("https://www.strato.de/");
	await page.locator('button:has-text("Einstellungen")').click();
	await page.locator("text=Auswahl bestätigen").click();
	await page.locator("header >> text=Login").click();
	await page.locator('text=STRATO Kunden-Login Bitte aktivieren Sie Cookies im Browser. Benutzername oder K >> input[name="identifier"]').click();
	await page.locator('text=STRATO Kunden-Login Bitte aktivieren Sie Cookies im Browser. Benutzername oder K >> input[name="identifier"]').fill(config.admin_user);
	await page.locator('text=STRATO Kunden-Login Bitte aktivieren Sie Cookies im Browser. Benutzername oder K >> input[name="passwd"]').click();
	await page.locator('text=STRATO Kunden-Login Bitte aktivieren Sie Cookies im Browser. Benutzername oder K >> input[name="passwd"]').fill(config.admin_password);
	await page.locator('text=STRATO Kunden-Login Bitte aktivieren Sie Cookies im Browser. Benutzername oder K >> input[name="action_customer_login\\.x"]').click();
	await page.locator("text=E-Mails verwalten").click();
	return { page, browser };
}

async function create_mailbox(page: Page, user: User): Promise<Page> {
	await page.locator('[aria-label="\\.\\.\\."] >> text=Neu anlegen').click();
	await page.locator("text=Basic-Postfach anlegen").click();
	await page.locator('input[name="account_name"]').click();
	await page.locator('input[name="account_name"]').fill(user.username);
	await page.locator("text=Alle Domains Alle Domains").click();
	await page.locator(`a[role="option"]:has-text("${config.new_domain}")`).click();
	await page.locator('input[name="password_new"]').click();
	await page.locator('input[name="password_new"]').fill(user.password);
	await page.evaluate(() => {
		const element = document.querySelector(".action_customer_password_change")
		if (element) element.classList.remove("disabled")
	});
	await page.locator('input:has-text("Postfach anlegen")').click();
	await page.locator("text=Weitere Einstellungen vornehmen").nth(1).click();
	if (user.kuerzel) {
		await page.locator('input[name="alias_localpart"]').click();
		await page.locator('input[name="alias_localpart"]').fill(user.kuerzel.toLowerCase());
		await page.locator('select[name="alias_domain"]').selectOption(config.new_domain);
	}
	await page.locator("text=Postfachgröße ändern Einklappen Ausklappen").click();
	await page.locator('input[name="new_reserved_quota"]').fill("2");
	await page.locator('input:has-text("Speichern")').click();
	await page.locator("text=Zur Übersicht").click();
	return page;
}
async function end_script(browser: Browser): Promise<void> {
	await browser.close();
}

async function main() {
	let create = [];
	let existing: User[] = [];

	try {
		const file = readFileSync(resolve(__dirname, "../users.csv"), "utf8");
		create = Papa.parse(file).data;
	} catch (e) {
		console.log('Problem mit "users.csv": ', e);
	}
	try {
		const data = readFileSync(resolve(__dirname, "../existing.json"), "utf8");
		existing = JSON.parse(data);
	} catch (e) {
		console.log("Es gibt keine bisherigen Benutzer, erstelle Datei mit Logs: existing.json");
	}

	const users = create.map(u => create_user(u));

	const { browser, page } = await start_script();

	for await (const user of users) {
		const vorhanden = existing.find(e => (e.name === user.name));
		if (vorhanden) {
			console.log(user.name, "skipped");
		} else {
			try {
				await create_mailbox(page, user);
				existing.push(user);
				// nicht sehr elegant, aber vollständig
				writeFileSync(resolve(__dirname, "../existing.json"), JSON.stringify(existing));
				console.log(user.name, "added");
			} catch (e) {
				console.log("Fehler bei", user.name, e);
			}
		}
	}
	await end_script(browser);
}

main();
