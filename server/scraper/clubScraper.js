const puppeteer = require("puppeteer");
const { saveDataBasePhones } = require("../controllers/phoneDataControllers");
const logger = require("../utils/logger");

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
        "--disable-webgl"
      ],
      ignoreHTTPSErrors: true,
    });

    logger.info("Navegador lanzado");

    const page = await browser.newPage();
    await page.goto("https://clubdeinversores.com/wp-admin", { waitUntil: 'networkidle2' });
    logger.info("Página de login cargada");

    // Ingresar credenciales
    await page.type('input[name="login_username"]', "cerramaximiliano@gmail.com");
    logger.info("Nombre de usuario ingresado");
    
    await page.type('input[name="login_password"]', "cerramax?=)(.12");
    logger.info("Contraseña ingresada");

    // Iniciar sesión
    await page.click('input[type="submit"][value="Iniciar sesión"]');
    logger.info("Botón de login clickeado");

    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 90000 });
    logger.info("Login exitoso, redirigido");

    // Ajustar viewport
    await page.setViewport({ width: 1920, height: 1080 });
    logger.info("Viewport ajustado");

    // Navegar a la página de usuarios
    await page.waitForSelector('a[href="users.php"]', { timeout: 90000 });
    logger.info("Selector para usuarios encontrado");

    await page.evaluate(() => {
      const link = document.querySelector('a[href="users.php"]');
      link.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    });
    logger.info("Enlace a usuarios scrolleado");

    await page.goto("https://clubdeinversores.com/wp-admin/users.php");
    await page.waitForSelector('#the-list', { timeout: 120000 });
    logger.info("Redirigido a la página de Usuarios!");

    // Navegar a la página del miembro
    await page.waitForSelector(
      `a[href="users.php?role=s2member_level${memberType}"]`,
      { timeout: 80000 }
    );
    await page.click(`a[href="users.php?role=s2member_level${memberType}"]`);
    logger.info("Redirigido a la página Club Member!");

    // Esperar hasta que el elemento tbody esté presente en la página
    await page.waitForSelector("#the-list", { timeout: 120000 });

    let hasNextPage = true;
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
      logger.info(`Datos de miembros obtenidos: ${JSON.stringify(memberData)}`);
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
            page.waitForNavigation({ waitUntil: "networkidle0", timeout: 120000 }), // Espera a que se cargue la nueva página
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
    logger.info("Navegador cerrado exitosamente");

  } catch (err) {
    logger.error(`Error durante el scraping: ${err.message}`);
    
    if (page) {
      const content = await page.content();
      logger.error(`Contenido de la página al fallar: ${content}`);
    }
    
    throw err;
  }
}

module.exports = {
  loginAndScrape,
};
