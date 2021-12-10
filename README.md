# Running (Linux only)

**Prerequisites**

- Install wfantund: https://github.com/TexasInstruments/ti-wisunfantund

- Download and import the TI GUI Composer project (Requires a dev.ti account): https://github.com/Justin-Schmisseur/TI_WebApp_Protoype

- Install webserver dependencies with `npm install`

**Get Started**

Start the Server : `npm run wfan`

# Mocking (Cross-Platform)

1. Start the Mock Server

   `npm run mock`

2. Emulate a border router connection (in a separate terminal window from mock server):

   `npm run mock_connect`

3. Emulate a border router disconnection (in a separate terminal window from mock server):

   `npm run mock_disconnect`

___
### Development Only

Formatter: Prettier
Linter: eslint

1. Install the prettier and eslint in the global npm packages

   `npm install -g prettier eslint`

2. Install the prettier and eslint extensions for your editor
