// src/TimeTracker.js
import React, { useState, useEffect } from 'react';
import { openDB } from 'idb';

const TimeTracker = () => {
  const [timeIn, setTimeIn] = useState(null);
  const [timeOut, setTimeOut] = useState(null);

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
  }, []);

  const handleTimeIn = async () => {
    const now = new Date().toISOString();
    setTimeIn(now);

    const db = await openDB('time-tracker', 1);
    const tx = db.transaction('times', 'readwrite');
    const store = tx.objectStore('times');
    await store.add({ timeIn: now, timeOut: null });
  };

  const handleTimeOut = async () => {
    const now = new Date().toISOString();
    setTimeOut(now);

    const db = await openDB('time-tracker', 1);
    const tx = db.transaction('times', 'readwrite');
    const store = tx.objectStore('times');
    const allTimes = await store.getAll();
    const lastTime = allTimes[allTimes.length - 1];

    await store.put({ ...lastTime, timeOut: now });
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
    </div>
  );
};

export default TimeTracker;
