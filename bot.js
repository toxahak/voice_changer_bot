#!/usr/bin/env node
const _ = require('lodash')
const Telegraf = require('telegraf');
const needle = require('needle')
const fs = require('fs');
const voice_changer = require('./voice_changer.js');

const E = exports;

const log = (event, props)=>{
    console.log(event, props||'');
}

const handle_err = err=>{
    log('Ooops', err);
};

const help_message = `How to use:
Step 1: Just send me a voice note 🎤
Step 2: Enjoy the result ☺️`;

const handle_start = async (ctx)=>{
    log('start')
    ctx.reply(help_message);
};

const handle_help = ctx=>ctx.reply(help_message);

const handle_text = async (ctx)=>{
    log('handle_text')
    ctx.reply(help_message);
};

const tmp_dir = '/usr/app/tmp';

const handle_voice = async (ctx)=>{
    const {message_id, voice: {file_id, duration}} = ctx.message;
    log('handle_voice')
    ctx.replyWithChatAction('record_audio');
    const voice_url = await ctx.telegram.getFileLink(file_id);
    const tmp_path = `${tmp_dir}/${message_id}.ogg`;
    await new Promise(res=>{
        needle.get(voice_url)
            .pipe(fs.createWriteStream(tmp_path))
            .on('finish', res);
    });
    let source = voice_changer.transform(fs.createReadStream(tmp_path), {slim: true});
    await ctx.replyWithVoice({source});
    source = voice_changer.transform(fs.createReadStream(tmp_path), {mid: true});
    await ctx.replyWithVoice({source});
    source = voice_changer.transform(fs.createReadStream(tmp_path));
    await ctx.replyWithVoice({source});
    fs.unlinkSync(tmp_path);
};

E.main = ()=>{
    log('starting voice bot');
    if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN=='specify_your_telegram_bot_token_here')
        throw 'specify your telegram bot token in ./config.env (see README)';
    voice_changer.init();
    const bot = new Telegraf(process.env.BOT_TOKEN);
    bot.catch(handle_err);
    bot.start(handle_start);
    bot.help(handle_help);
    bot.on('voice', handle_voice)
    bot.on('text', handle_text)
    bot.launch();
};

if (!module.parent) {
    E.main();
}