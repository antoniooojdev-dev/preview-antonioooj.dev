fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'aj_garage'
author 'AntonioooJ'
description 'Sistema de garajes y depósito con interfaz NUI (ESX / QBCore)'
version '1.0.0'

dependencies {
    'ox_lib',
    'oxmysql',
}

shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
}

client_scripts {
    'client/main.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/bridge.lua',
    'server/main.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/app.js',
}
