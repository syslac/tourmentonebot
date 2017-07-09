#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Simple Bot to reply to Telegram messages
# This program is dedicated to the public domain under the CC0 license.
"""
This Bot uses the Updater class to handle the bot.
First, a few handler functions are defined. Then, those functions are passed to
the Dispatcher and registered at their respective places.
Then, the bot is started and runs until we press Ctrl-C on the command line.
Usage:
Basic Echobot example, repeats messages.
Press Ctrl-C on the command line or send a signal to the process to stop the
bot.
"""

from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, Job
import logging
import sqlite3
import datetime

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)

logger = logging.getLogger(__name__)


# Define a few command handlers. These usually take the two arguments bot and
# update. Error handlers also receive the raised TelegramError object in error.
def start(bot, update):
    update.message.reply_text("""Hi! 
I can help you keep track of upcoming concerts; type /help to see what I can do
    """)

def help(bot, update):
    update.message.reply_text("""
Type /add yyyy-mm-dd Band@Place to add a new concert
Type /next to get a list of the upcoming shows
I will then remind you of approaching concerts one week before and on the same day.
""")


def echo(bot, update):
    update.message.reply_text("Sorry, unrecognized command.")


def error(bot, update, error):
    logger.warn('Update "%s" caused error "%s"' % (update, error))

def next_shows (bot, update, **optional_data):
    conn = sqlite3.connect('shows.sqlite')
    c = conn.cursor()
    chat_data = ''
    try: 
        chat_data = update.message.chat.id
    except:
        chat_data = ''

    found_one = False
    reply = " "
    for row in c.execute('SELECT * FROM shows WHERE `date` >= ? AND chat_id = ? ORDER BY `date` ASC LIMIT 0,5', 
            (datetime.datetime.today().strftime("%Y-%m-%d"), chat_data)
    ):
        found_one = True
        reply += "* " + row[2] + " - " + row[1] + "@" + row[3] + "\n"


    try:
        if (found_one):
            update.message.reply_text(reply)
        else:
            update.message.reply_text("No upcoming shows found")
    except:
        a = False

    conn.close()

def add_show(bot, update, **optional_data):
    conn = sqlite3.connect('shows.sqlite')
    c = conn.cursor()
    chat_data = ''
    try: 
        chat_data = update.message.chat.id
    except:
        chat_data = ''

    orig_text = update.message.text
    date = datetime.datetime.today().strftime("%Y-%m-%d")
    artist = ""
    venue = ""   
    try:
        info, venue = orig_text.split("@") 
        info_split = info.split(" ")
        date = info_split[1]
        artist_pieces = info_split[2:]
        artist = " ".join(artist_pieces)
    except:
        artist = artist + "error"    

    c.execute('INSERT INTO shows (artist, `date`, place, chat_id) VALUES (?, ?, ?, ?)', (artist, date, venue, chat_data)) 
    conn.commit()

    conn.close()

def check_approaching(bot, job):
    conn = sqlite3.connect('shows.sqlite')
    c = conn.cursor()
    chat_data = ''
    try: 
        chat_data = update.message.chat.id
    except:
        chat_data = ''

    # Shows in a week
    replies = {}
    for row in c.execute("""SELECT * FROM shows 
            WHERE `date` >= ? 
            AND `date` <= ? 
            AND (notified_week IS NULL OR notified_week = 0)
            ORDER BY chat_id""", 
            (datetime.datetime.today().strftime("%Y-%m-%d"), 
            (datetime.datetime.today() + datetime.timedelta(days=7)).strftime("%Y-%m-%d"))
    ):
        try:
            replies[str(row[6])] += "* " + row[2] + " - " + row[1] + "@" + row[3] + "\n"
        except:
            replies[str(row[6])] = "* " + row[2] + " - " + row[1] + "@" + row[3] + "\n"
        try:
            c.execute("UPDATE shows SET notified_week = ? WHERE id = ?", (1, int(row[0])))
        except:
            a = False

    try:
        for chat, msg in replies.items():
            bot.send_message(chat_id=chat,
                text="The following shows are approaching!\n" + msg)
    except:
        a = False

    # Shows today
    replies = {}
    for row in c.execute("""SELECT * FROM shows 
            WHERE `date` = ? 
            AND (notified_day IS NULL OR notified_day = ?)
            ORDER BY chat_id""", 
            (datetime.datetime.today().strftime("%Y-%m-%d"), 0)
    ):
        try:
            replies[str(row[6])] += "* " + row[2] + " - " + row[1] + "@" + row[3] + "\n"
        except:
            replies[str(row[6])] = "* " + row[2] + " - " + row[1] + "@" + row[3] + "\n"
        try:
            c.execute("UPDATE shows SET notified_day = ? WHERE id = ?", (1, int(row[0])))
        except:
            a = False

    try:
        for chat, msg in replies.items():
            bot.send_message(chat_id=chat,
                text="The following shows are TODAY!\n" + msg)
    except:
        a = False

    conn.commit()
    conn.close()
    

def main():
    # Create the EventHandler and pass it your bot's token.
    updater = Updater("422080493:AAHV9FT0Tsh6tc0mJjE0JCQU4PHvY3120NE")

    # Add cron jobs
    jobs = updater.job_queue
    jobs.run_daily(check_approaching, datetime.time(7, 0, 0))

    # Get the dispatcher to register handlers
    dp = updater.dispatcher

    # on different commands - answer in Telegram
    dp.add_handler(CommandHandler("start", start))
    dp.add_handler(CommandHandler("help", help))
    dp.add_handler(CommandHandler("next", next_shows, pass_user_data=True, pass_chat_data=True))
    dp.add_handler(CommandHandler("add", add_show, pass_user_data=True, pass_chat_data=True))

    # on noncommand i.e message - echo the message on Telegram
    dp.add_handler(MessageHandler(Filters.text, echo))

    # log all errors
    dp.add_error_handler(error)

    # Start the Bot
    updater.start_polling()

    # Run the bot until you press Ctrl-C or the process receives SIGINT,
    # SIGTERM or SIGABRT. This should be used most of the time, since
    # start_polling() is non-blocking and will stop the bot gracefully.
    updater.idle()


if __name__ == '__main__':
    main()
