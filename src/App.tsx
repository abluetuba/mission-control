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

function App() {
  const [lat, setLat] = useState(0);
  const [long, setLong] = useState(0);
  const [tle, setTle] = useState<string[]>([]);
  const [orbit, setOrbit] = useState<LatLngTuple[]>([]);

  useEffect(() => {
    let ignore = false;
    async function fecthTle() {
      const res = await fetch(
        //"https://celestrak.org/NORAD/elements/stations.txt"
        // "/stations.txt"
        "https://live.ariss.org/iss.txt"
      );
      const data = await res.text();
      if (!ignore) {
        const lines = data.split("\r\n");
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
        setOrbit(orbitArr);
      }, 500);

      return () => clearInterval(interval);
    }
  }, [tle]);

  const generateLines = (startIdx: number, endIdx: number) => {
    const lines = [];
    let currentLine = [];

    for (let i = startIdx; i < endIdx; i++) {
      if (currentLine.length === 0) {
        currentLine.push(orbit[i]);
      } else {
        const currentSign = Math.sign(orbit[i][1]);
        const lastSign = Math.sign(orbit[i - 1][1]);

        if (currentSign !== lastSign && Math.abs(orbit[i][1]) > 175) {
          lines.push([...currentLine]);
          currentLine = [];
        }

        currentLine.push(orbit[i]);
      }
    }

    if (currentLine.length > 0) {
      lines.push([...currentLine]);
    }

    return lines;
  };

  let pastLines: LatLngTuple[][] = [];
  let futureLines: LatLngTuple[][] = [];

  if (orbit.length > 0) {
    pastLines = generateLines(0, orbit.length / 2 + 1);
    futureLines = generateLines(orbit.length / 2, orbit.length);
  }

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

          {pastLines.map((line, i) => (
            // TODO: refactor key
            <Polyline key={i} positions={line} color="orange" />
          ))}
          {futureLines.map((line, i) => (
            // TODO: refactor key
            <Polyline key={i} positions={line} />
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
