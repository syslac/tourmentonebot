# TourmentoneBot 

## Python version (meant for self-hosting)

Simple Telegram bot (in Python) to help keep track of upcoming concerts.

### Features 

 * `/add` command, to add new event; mandatory format is /add yyyy-mm-dd Artist@Venue
 * `/next` command, to show the first 5 upcoming events
 * Automatic reminder of shows within the same week, and on the same day of the event
 * Records chat info, so should be okay to use personally and in one or more group chats, without confusion

Can potentially obviously be used for deadlines not related to music

### Backend 

Simple sqlite table named `shows`, with schema (id PRIMARY, artist text, date text, place text, notified_week int, notified_day int, chat_id text)

## Javascript version (meant for being deployed on Google Apps Script)

Simple Telegram bot usable as a personal organizer; CRUD operations on a handful of lists, e.g. groceries, ideas, todos. Easily extensible

### Features

 * `/groceries|/todos|/ideas` are the commands available, each of them accepts:
   * a `list` verb (also default, with no verbs): returns the full list
   * an `add` verb, to add whatever comes next as a new row in the corresponding list
   * a `clear` verb, to clear the list
   * a `delete (\d+)` verb, to delete the n-th entry in the list, in the same order given by `list`

### Backend

Assumes to be run on a Drive account with a pre-created Sheet document that's accessible by the script owner. Each list will be given a different sheet in the document.

## What do the two bots have in common? 

Nothing; the Python one was an abandoned project, and I reused both bot and repo.
