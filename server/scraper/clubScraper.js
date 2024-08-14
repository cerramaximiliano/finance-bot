const puppeteer = require("puppeteer");
const { saveDataBasePhones } = require("../controllers/phoneDataControllers");

async function loginAndScrape(memberType) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    await page.goto("https://clubdeinversores.com/wp-admin");

    // Selector para el campo de nombre de usuario
    await page.type(
      'input[name="login_username"]',
      "cerramaximiliano@gmail.com"
    );
    // Selector para el campo de contraseña
    await page.type('input[name="login_password"]', "cerramax?=)(.12");

    // Selector para el botón de envío (Iniciar sesión)
    await page.click('input[type="submit"][value="Iniciar sesión"]');

    await page.waitForNavigation();

    console.log("Login successful!");
    // Navegar a la página "Usuarios"
    await page.setViewport({ width: 1920, height: 1080 });

    await page.waitForSelector('a[href="users.php"]', { timeout: 60000 });

    await page.evaluate(() => {
      const link = document.querySelector('a[href="users.php"]');
      link.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    });
    await page.click('a[href="users.php"]');
    await page.waitForNavigation();

    console.log("Redirigido a la página de Usuarios!");

    // Esperar a que el enlace "Club Member" esté disponible y hacer clic en él
    await page.waitForSelector(
      `a[href="users.php?role=s2member_level${memberType}"]`,
      {
        timeout: 80000,
      }
    );
    await page.click(`a[href="users.php?role=s2member_level${memberType}"]`);

    console.log("Redirigido a la página Club Member!");

    // Esperar hasta que el elemento tbody esté presente en la página
    await page.waitForSelector("#the-list");

    let hasNextPage = true;
    let phones = [];
    let members = [];

    while (hasNextPage) {
      // Realiza el scraping de la tabla para obtener los números de teléfono
      const memberData = await page.$$eval("#the-list tr", (rows) => {
        return rows.map((row) => {
          const name = row
            .querySelector('td[data-colname="Nombre"]')
            .textContent.trim();
          const phone = row
            .querySelector('td[data-colname="Telefono"]')
            .textContent.trim();
          return { name, phone };
        });
      });
      console.log(memberData);
      members.push(...memberData);

      // Verifica si existe el botón de "Página siguiente"
      const nextPageButton = await page.$("a.next-page.button");

      if (nextPageButton) {
        const isDisabled = await page.evaluate(
          (button) => button.classList.contains("disabled"),
          nextPageButton
        );
        if (!isDisabled) {
          await Promise.all([
            page.click("a.next-page.button"),
            page.waitForNavigation({ waitUntil: "networkidle0" }), // Espera a que se cargue la nueva página
          ]);
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
    }

    if (members.length > 0) {
      await saveDataBasePhones(members, memberType);
    }

    // Cerrar el navegador si es necesario
    await browser.close();
  } catch (err) {
    throw err;
  }
}

module.exports = {
  loginAndScrape,
};
