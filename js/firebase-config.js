// js/firebase-config.js
(function() {
  var firebaseConfig = {
    apiKey: "AIzaSyB4GChSVJaGJOfrgFAtY8qd2TEZR1roA9U",
    authDomain: "janakiprofessionalacademy.firebaseapp.com",
    projectId: "janakiprofessionalacademy",
    storageBucket: "janakiprofessionalacademy.firebasestorage.app",
    messagingSenderId: "251032601039",
    appId: "1:251032601039:web:4c6829d2591458f45a12ba",
    measurementId: "G-707JTX1XKM"
  };
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.db = firebase.database ? firebase.database() : null;
  window.auth = firebase.auth ? firebase.auth() : null;
})();
