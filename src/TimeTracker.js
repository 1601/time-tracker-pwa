// src/TimeTracker.js
import React, { useState, useEffect } from 'react';
import { openDB } from 'idb';

const TimeTracker = () => {
  const [timeIn, setTimeIn] = useState(null);
  const [timeOut, setTimeOut] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [unsyncedData, setUnsyncedData] = useState(false);

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

    // Replace this with your actual backend sync logic
    try {
      await Promise.all(allTimes.map(async (time) => {
        if (!time.synced) {
          // Simulate backend sync
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
    </div>
  );
};

export default TimeTracker;
