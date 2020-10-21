require('dotenv').config()

const notifier = require('node-notifier')
const puppeteer = require('puppeteer')

async function getGrades({ username, password }) {
    console.log('Getting grades...')

    const browser = await puppeteer.launch()
    const page = await browser.newPage()

    await page.goto('https://sbstads.au.dk/sb_STAP/sb/resultater/studresultater.jsp')

    await page.waitForXPath('//div[text()="Aarhus University"]')
    console.log('Found path!')
    
    const [button] = await page.$x('//div[text()="Aarhus University"]')
    console.log('Found button')
    await button.click()

    await page.waitForNavigation()
    console.log('Arrived at login form')
    
    await page.evaluate(({ username, password }) => {
        document.querySelector('input[name="username"]').value = username
        document.querySelector('input[name="password"]').value = password
    }, { username, password })
    await page.click('input.button[type="submit"]')

    console.log('Submitted login form')

    await page.waitForSelector('#resultTable')

    console.log('Found result table')

    console.log('Mapping rows...')

    let grades = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#resultTable tbody tr'))
        .map(grade => {
            let columns = grade.querySelectorAll('td')
            return {
                course: columns[0].textContent.trim(),
                gradedAt: columns[1].textContent.trim(),
                grade: columns[2].textContent.trim(),
                ectsGrade: columns[3].textContent.trim()
            }
        })
    })

    browser.close()

    return grades
}

async function monitorGrades({ username, password }) {
    let grades = await getGrades({ username, password })

    console.log('All grades', { grades })
    console.log('Latest grade', grades[0])

    if (grades[0]['gradedAt'] != process.env.LATEST_GRADE_AT) {
        notifier.notify({
            title: 'Ny karakter!',
            message: `Fag: ${grades[0]['course']}, karakter: ${grades[0]['grade']}`,
            reply: true,
            timeout: 999
        })
    }

    // Check every 15 minutes
    setTimeout(() => { monitorGrades({ username, password }) }, 1000 * 60 * 15)
}

let { USERNAME: username, PASSWORD: password } = process.env

if (!username || !password) {
    console.log('Missing username or password')
    return
}

monitorGrades({ username, password })