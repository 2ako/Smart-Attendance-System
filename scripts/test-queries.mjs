
import { createClient } from '@sanity/client';

const client = createClient({
    projectId: "4vonm4i0",
    dataset: "production",
    useCdn: false,
    apiVersion: '2023-05-03',
    token: "sknQ8OewnjT5MCK58NSwDaQR3dZ6GqmHhkBM902495A1rYMeoA1kSP7xQkhUkBMDvBZyV4oMcrRUqkyYncLSm4pmuctgjEltHdWN96gfJ8qsgK7YJ3nQnRB2sYWbzQl0mnUr9TyBNDDUnVlGas78LOXueNUthJU3By6TqPQfucbhurcvcp1O",
});

async function test() {
    const sfCode = "";
    const params = { studyField: sfCode, studyFieldId: "" };

    const roomsQuery = `*[_type == "room" && (!defined($studyField) || $studyField == "" || studyField match $studyField || studyField._ref == $studyFieldId)]`;
    const devicesQuery = `*[_type == "device" && (!defined($studyField) || $studyField == "" || studyField match $studyField || studyField._ref == $studyFieldId)]`;
    const adminsQuery = `*[_type == "user" && role == "admin"]`;

    try {
        const rooms = await client.fetch(roomsQuery, params);
        const devices = await client.fetch(devicesQuery, params);
        const admins = await client.fetch(adminsQuery);

        console.log("Rooms count:", rooms.length);
        console.log("Devices count:", devices.length);
        console.log("Admins count:", admins.length);

        if (admins.length > 0) {
            console.log("Admins:", admins.map(a => `${a.name} (${a.studyField || 'Super'})`));
        }
    } catch (e) {
        console.error(e);
    }
}

test();
