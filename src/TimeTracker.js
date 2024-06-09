// src/TimeTracker.js
import React, { useState, useEffect } from 'react';
import { openDB } from 'idb';

const TimeTracker = () => {
  const [timeIn, setTimeIn] = useState(null);
  const [timeOut, setTimeOut] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [unsyncedData, setUnsyncedData] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState('Today');
  const [availableDates, setAvailableDates] = useState([]);

  useEffect(() => {
    (async () => {
      const db = await openDB('time-tracker', 1, {
        upgrade(db) {
          db.createObjectStore('times', { keyPath: 'id', autoIncrement: true });
        },
      });

      const tx = db.transaction('times', 'readonly');
      const store = tx.objectStore('times');
      const times = await store.getAll();

      if (times.length > 0) {
        const lastTime = times[times.length - 1];
        setTimeIn(lastTime.timeIn);
        setTimeOut(lastTime.timeOut);

        const today = new Date().toISOString().split('T')[0];
        const todayTimes = times.filter(
          time => time.timeIn && time.timeIn.startsWith(today)
        );
        setHistory(todayTimes);

        const uniqueDates = [
          ...new Set(
            times.map(time => time.timeIn.split('T')[0])
          ),
        ].map(date => ({
          value: date,
          label: new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: '2-digit',
          }),
        }));

        setAvailableDates([{ value: 'Today', label: 'Today' }, ...uniqueDates]);
      }
    })();

    const handleOnline = () => {
      setIsOffline(false);
      syncData();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncData = async () => {
    const db = await openDB('time-tracker', 1);
    const tx = db.transaction('times', 'readonly');
    const store = tx.objectStore('times');
    const allTimes = await store.getAll();

    try {
      await Promise.all(allTimes.map(async (time) => {
        if (!time.synced) {
          console.log('Syncing data:', time);
          time.synced = true;
          const tx = db.transaction('times', 'readwrite');
          const store = tx.objectStore('times');
          await store.put(time);
        }
      }));
      setUnsyncedData(false);
    } catch (error) {
      console.error('Sync failed:', error);
      setUnsyncedData(true);
    }
  };

  const handleTimeIn = async () => {
    const now = new Date().toISOString();
    setTimeIn(now);

    const db = await openDB('time-tracker', 1);
    const tx = db.transaction('times', 'readwrite');
    const store = tx.objectStore('times');
    await store.add({ timeIn: now, timeOut: null, synced: !isOffline });

    if (isOffline) {
      setUnsyncedData(true);
    }

    loadHistoryForDate('Today');
  };

  const handleTimeOut = async () => {
    const now = new Date().toISOString();
    setTimeOut(now);

    const db = await openDB('time-tracker', 1);
    const tx = db.transaction('times', 'readwrite');
    const store = tx.objectStore('times');
    const allTimes = await store.getAll();
    const lastTime = allTimes[allTimes.length - 1];

    await store.put({ ...lastTime, timeOut: now, synced: !isOffline });

    if (isOffline) {
      setUnsyncedData(true);
    }

    loadHistoryForDate('Today');
  };

  const loadHistoryForDate = async (date) => {
    const db = await openDB('time-tracker', 1);
    const tx = db.transaction('times', 'readonly');
    const store = tx.objectStore('times');

    let times;
    if (date === 'Today') {
      const today = new Date().toISOString().split('T')[0];
      times = await store.getAll();
      times = times.filter(
        time => time.timeIn && time.timeIn.startsWith(today)
      );
    } else {
      times = await store.getAll();
      times = times.filter(
        time => time.timeIn && time.timeIn.startsWith(date)
      );
    }

    setHistory(times);
  };

  const handleDateChange = (event) => {
    const selectedDate = event.target.value;
    setSelectedDate(selectedDate);
    loadHistoryForDate(selectedDate);
  };

  return (
    <div>
      <h1>Time Tracker</h1>
      <div>
        <button onClick={handleTimeIn} disabled={timeIn && !timeOut}>Time In</button>
        <button onClick={handleTimeOut} disabled={!timeIn || timeOut}>Time Out</button>
      </div>
      <div>
        <p>Time In: {timeIn ? new Date(timeIn).toLocaleString() : 'Not yet'}</p>
        <p>Time Out: {timeOut ? new Date(timeOut).toLocaleString() : 'Not yet'}</p>
      </div>
      {isOffline && (
        <div style={{ color: 'red' }}>
          You are offline. Your data will be synced when you are back online.
        </div>
      )}
      {unsyncedData && !isOffline && (
        <div style={{ color: 'orange' }}>
          You have unsynced data. Please wait while it is being synced.
        </div>
      )}
      <div>
        <select value={selectedDate} onChange={handleDateChange}>
          {availableDates.map(date => (
            <option key={date.value} value={date.value}>{date.label}</option>
          ))}
        </select>
        <table>
          <thead>
            <tr>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, index) => (
              <tr key={index}>
                <td>{new Date(entry.timeIn).toLocaleString()}</td>
                <td>{entry.timeOut ? new Date(entry.timeOut).toLocaleString() : 'Not yet'}</td>
                <td>
                  {entry.timeOut ? 
                    new Date(new Date(entry.timeOut) - new Date(entry.timeIn)).toISOString().substr(11, 8) 
                    : 'In progress'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeTracker;
