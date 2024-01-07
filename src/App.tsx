import "./App.css";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from "satellite.js";
import { MapContainer, Marker, TileLayer, Polyline } from "react-leaflet";
import { useEffect, useState } from "react";
import { LatLngTuple } from "leaflet";

type Orbit = {
  past: LatLngTuple[][];
  future: LatLngTuple[][];
};

const generateLines = (
  orbitArr: LatLngTuple[],
  startIdx: number,
  endIdx: number
) => {
  const lines = [];
  let currentLine = [];

  for (let i = startIdx; i < endIdx; i++) {
    if (currentLine.length === 0) {
      currentLine.push(orbitArr[i]);
    } else {
      const currentSign = Math.sign(orbitArr[i][1]);
      const lastSign = Math.sign(orbitArr[i - 1][1]);

      if (currentSign !== lastSign && Math.abs(orbitArr[i][1]) > 150) {
        lines.push([...currentLine]);
        currentLine = [];
      }

      currentLine.push(orbitArr[i]);
    }
  }

  if (currentLine.length > 0) {
    lines.push([...currentLine]);
  }

  return lines;
};

function App() {
  const [lat, setLat] = useState(0);
  const [long, setLong] = useState(0);
  const [tle, setTle] = useState<string[]>([]);
  const [orbit, setOrbit] = useState<Orbit>({ past: [], future: [] });

  useEffect(() => {
    let ignore = false;
    async function fecthTle() {
      const res = await fetch(
        //"https://celestrak.org/NORAD/elements/stations.txt"
        // "/stations.txt"
        // "https://live.ariss.org/iss.txt"
        "https://api.wheretheiss.at/v1/satellites/25544/tles?format=text"
      );
      const data = await res.text();
      console.log({ data });
      if (!ignore) {
        const lines = data.split("\n");
        setTle([lines[1], lines[2]]);
      }
    }
    fecthTle();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (tle.length > 0) {
      const interval = setInterval(() => {
        const satRec = twoline2satrec(tle[0], tle[1]);
        // console.log(satRec);
        const date = new Date();
        const positionAndVelocity = propagate(satRec, date);
        const gmst = gstime(date);
        const positionEci = positionAndVelocity.position;
        if (typeof positionEci === "object") {
          const position = eciToGeodetic(positionEci, gmst);
          setLat(degreesLat(position.latitude));
          setLong(degreesLong(position.longitude));
        }

        const orbitArr: LatLngTuple[] = [];
        date.setMinutes(date.getMinutes() - 90);
        for (let i = 0; i < 180; i++) {
          const satRec = twoline2satrec(tle[0], tle[1]);
          // console.log(satRec);
          const positionAndVelocity = propagate(satRec, date);
          // console.log(positionAndVelocity);
          const gmst = gstime(date);
          const positionEci = positionAndVelocity.position;
          if (typeof positionEci === "object") {
            const position = eciToGeodetic(positionEci, gmst);
            const pos: LatLngTuple = [
              degreesLat(position.latitude),
              degreesLong(position.longitude),
            ];
            orbitArr.push(pos);
          }
          date.setMinutes(date.getMinutes() + 1);
        }

        if (orbitArr.length > 0) {
          setOrbit({
            past: generateLines(orbitArr, 0, orbitArr.length / 2 + 1),
            future: generateLines(
              orbitArr,
              orbitArr.length / 2,
              orbitArr.length
            ),
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [tle]);

  return (
    <>
      <div>
        <h2>ISS Tracker</h2>
        <MapContainer
          center={[0, 0]}
          zoom={2}
          scrollWheelZoom={true}
          className="map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={[lat, long]} />

          {orbit.past.map((line, i) => (
            <Polyline key={`past${i}`} positions={line} color="orange" />
          ))}
          {orbit.future.map((line, i) => (
            <Polyline key={`fut${i}`} positions={line} />
          ))}
          {/*<View center={[lat, long]} />*/}
        </MapContainer>
      </div>
      <h3>
        LAT: {lat.toFixed(2)} LNG: {long.toFixed(2)}
      </h3>

      {/* <div className="card">
        <p>
          FOOTER
        </p>
      </div>*/}
    </>
  );
}

// eslint-disable-next-line
/* function View({ center }: { center: LatLngExpression }) {
  const map = useMap();
  map.setView(center);
  return <></>;
}
*/

export default App;
