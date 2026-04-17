// Google Apps Script — Calendar Events API for Mission Control
// Deploy as: Web App > Execute as: Me > Access: Anyone with Google account
//
// Usage: GET <web-app-url>?days=2
// Returns JSON: { today: [...], tomorrow: [...], fetchedAt: "..." }

function doGet(e) {
  var days = parseInt((e && e.parameter && e.parameter.days) || "2", 10);
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  var endDate = new Date(todayStart.getTime() + days * 24 * 60 * 60 * 1000);

  var calendars = CalendarApp.getAllCalendars();
  var primaryCal = CalendarApp.getDefaultCalendar();

  // Collect events from primary calendar
  var events = primaryCal.getEvents(todayStart, endDate);

  var todayStr = Utilities.formatDate(todayStart, Session.getScriptTimeZone(), "yyyy-MM-dd");
  var tomorrowDate = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  var tomorrowStr = Utilities.formatDate(tomorrowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");

  var todayEvents = [];
  var tomorrowEvents = [];

  for (var i = 0; i < events.length; i++) {
    var evt = events[i];

    // Skip all-day events named "Home" or similar
    if (evt.isAllDayEvent()) {
      var title = evt.getTitle().toLowerCase();
      if (title === "home" || title === "ooo" || title === "out of office") continue;
    }

    // Skip all-day events entirely (optional — remove this if you want them)
    if (evt.isAllDayEvent()) continue;

    var startTime = evt.getStartTime();
    var eventDateStr = Utilities.formatDate(startTime, Session.getScriptTimeZone(), "yyyy-MM-dd");
    var timeStr = Utilities.formatDate(startTime, Session.getScriptTimeZone(), "h:mm a");

    var attendees = evt.getGuestList(true);
    var location = evt.getLocation() || "";

    var entry = {
      title: evt.getTitle(),
      time: timeStr,
      attendees: attendees.length,
      location: location
    };

    if (eventDateStr === todayStr) {
      todayEvents.push(entry);
    } else if (eventDateStr === tomorrowStr) {
      tomorrowEvents.push(entry);
    }
  }

  // Sort by time
  function sortByTime(a, b) {
    return new Date("2000-01-01 " + a.time).getTime() - new Date("2000-01-01 " + b.time).getTime();
  }
  todayEvents.sort(sortByTime);
  tomorrowEvents.sort(sortByTime);

  var result = {
    today: todayEvents,
    tomorrow: tomorrowEvents,
    fetchedAt: new Date().toISOString()
  };

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
