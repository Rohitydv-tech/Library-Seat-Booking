/* OPTIONAL Firebase cloud sync (Firestore). Leave the placeholders as they are and the app
   keeps working with LocalStorage only. Fill in your own project's values to enable sync. */
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getFirestore,doc,onSnapshot,setDoc} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig={
  apiKey:"YOUR_API_KEY",
  authDomain:"YOUR_PROJECT.firebaseapp.com",
  projectId:"YOUR_PROJECT_ID",
  storageBucket:"YOUR_PROJECT.appspot.com",
  messagingSenderId:"YOUR_SENDER_ID",
  appId:"YOUR_APP_ID"
};

if(!firebaseConfig.apiKey.startsWith("YOUR_")){
  const db=getFirestore(initializeApp(firebaseConfig));
  const ref=doc(db,"lpu_library","main");   // the whole app state is one document
  let last="";                               // last JSON seen, stops echo loops
  window.FB={push(d){
    const j=JSON.stringify(d);if(j===last)return;last=j;
    setDoc(ref,{json:j,updated:Date.now()}).catch(e=>console.error("Firebase save failed",e));
  }};
  onSnapshot(ref,snap=>{
    if(!snap.exists()){window.FB.push(window.getLocalDB());return}   // first run: upload demo data
    const j=snap.data().json;if(j===last)return;last=j;
    window.onRemoteDB(JSON.parse(j));
  },e=>console.error("Firebase read failed",e));
  console.info("Firebase sync on");
}else console.info("Firebase not configured: using LocalStorage only");
