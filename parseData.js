// parseData.js

const parseVoterData = (fileContent, bhagNumber) => {
    const lines = fileContent.split('\n');
    const voters = [];
    let currentVoter = null;
    let inDataSection = false;

    // Regular expressions for common patterns
    // This regex tries to capture: S.No, HouseNo, Name, Relation, Relative Name, Gender, Age
    // It's flexible with spaces due to '+'
    const serialNumRegex = /^(\d+)\s+(\d+)\s+([\u0A80-\u0AFF\s]+?)\s*([પિ.મા.૫.અ.])?\s*([\u0A80-\u0AFF\s]+?)\s*([પુ.સ્ત્રી])\s*(\d+)/;
    const epicValueRegex = /(GJ\/\d{2}\/\d{6})/; // Just the EPIC value, often on a separate line or misaligned

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) continue; // Skip empty lines

        // Identify the start of the data section based on headers
        if (line.includes('અનુ.') && line.includes('ઘર') && line.includes('મતદારનું નામ')) {
            inDataSection = true;
            i++; // Skip the second header line if it exists immediately after
            while(i < lines.length && !lines[i].trim().match(/^\d+/)) {
                // Skip any non-data lines immediately after the header until a serial number starts
                i++;
            }
            i--; // Decrement to re-process the first data line
            continue;
        }

        if (!inDataSection) {
            // Check for Bhag Number from file content (less reliable, relying on user input for now)
            continue;
        }

        let match = line.match(serialNumRegex);

        if (match) {
            // Found a new voter entry
            if (currentVoter) {
                voters.push(currentVoter); // Push previous voter if exists
            }
            currentVoter = {
                bhag_number: bhagNumber,
                anukraman_number: parseInt(match[1]),
                ghar_number: match[2],
                matdar_name: match[3].trim(),
                sambandh: match[4] ? match[4].trim() : null, // 'પિ.', '૫.', etc.
                sambandhi_name: match[5].trim(),
                jati: match[6] === 'પુ.' ? 'પુ.' : 'સ્ત્રી', // Normalize to 'પુ.' or 'સ્ત્રી'
                umar: parseInt(match[7]),
                epic_number: null, // Will try to find in next lines or current
                raw_line: line // Store original line for debugging
            };
        } else if (currentVoter) {
            // If it's not a new entry line, check for EPIC number on this line
            const epicMatch = line.match(epicValueRegex);
            if (epicMatch && epicMatch[1]) {
                currentVoter.epic_number = epicMatch[1];
            }
            // If there are other multi-line fields, they would be handled here
        }
    }

    // Add the last processed voter if any
    if (currentVoter) {
        voters.push(currentVoter);
    }

    return voters;
};

module.exports = { parseVoterData };
