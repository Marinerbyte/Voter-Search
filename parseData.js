// parseData.js

const parseVoterData = (fileContent) => {
    const lines = fileContent.split('\n');
    const voters = [];
    let bhagNumber = null;
    let inDataSection = false;

    // --- Step 1: Find Bhag Number from the file ---
    const bhagNumRegex = /ભાગ નં\.:\s*(\d+)\/(\d+)/;
    for (const line of lines) {
        const match = line.match(bhagNumRegex);
        if (match && match[1]) {
            bhagNumber = parseInt(match[1]);
            break; // Found it, no need to look further
        }
    }

    if (bhagNumber === null) {
        // If bhag number is not found anywhere in the file
        return { error: "Bhag Number not found in the file.", voters: [], bhagNumber: null };
    }

    // --- Step 2: Parse Voter Data ---
    const serialNumRegex = /^(\d+)\s+(\S+)\s+([\u0A80-\u0AFF\s]+?)\s+([પિ.મા.૫.અ.])?\s*([\u0A80-\u0AFF\s]+?)\s+([પુ.સ્ત્રી])\s*(\d+)/;
    const epicValueRegex = /(GJ\/\d{2}\/\d{6})/;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) continue; // Skip empty lines

        // Identify the start of the data section
        if (!inDataSection && line.includes('અનુ.') && line.includes('ઘર') && line.includes('મતદારનું નામ')) {
            inDataSection = true;
            // Skip header and any lines until the first real data entry
            while (i + 1 < lines.length && !lines[i + 1].trim().match(/^\d+/)) {
                i++;
            }
            continue;
        }

        if (!inDataSection) {
            continue; // Keep skipping until we find the data section header
        }

        // --- Core Parsing Logic ---
        let match = line.match(serialNumRegex);

        if (match) {
            voters.push({
                bhag_number: bhagNumber,
                anukraman_number: parseInt(match[1]),
                ghar_number: match[2],
                matdar_name: match[3].trim(),
                sambandh: match[4] ? match[4].trim() : null,
                sambandhi_name: match[5].trim(),
                jati: match[6] === 'પુ.' ? 'પુ.' : 'સ્ત્રી',
                umar: parseInt(match[7]),
                epic_number: null, // Reset for new entry
                raw_line: line
            });
        } else if (voters.length > 0) {
            // Check for EPIC number on a separate line for the last added voter
            const lastVoter = voters[voters.length - 1];
            if (!lastVoter.epic_number) { // Only add if not already found
                const epicMatch = line.match(epicValueRegex);
                if (epicMatch && epicMatch[1]) {
                    lastVoter.epic_number = epicMatch[1];
                }
            }
        }
    }

    return { voters, bhagNumber };
};

module.exports = { parseVoterData };
