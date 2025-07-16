// Daves TradeMacro spreadsheets are for losers!!!!
// Creates a popup dialog to enter two UWPs and calculate trade modifiers

//TODO

//DONE  - Update dice roll to give final DM NOT total dice roll (skill roll function)
//DONE - Add the Parsec DM for Passengers/Freight
//DONE - Add Amber/RedZones
//DONE - Get Player Stats for Soc, Steward, Broker, Streetwise, Carouse  
//UWP/travellerMap/wiki API Calls
//DONE - Add FreightDM to Mail
//Add Roll/Tables for available Cargo/passengers
//Add Mail Roll
//DONE - DM tables for amount of Cargo/Freight/Passengers
//DONE - Add selectable skills for Freight/Passengers
//DONE - Add in Rolls for skills
//Add Difficulty to skill roll
//Add Cargo lot size rolls (1Dx10Ton Major 1Dx5Ton Minor 1DX1 Incidental)  - freightLotSizes function

//ACTOR STUFF --------------------------------------------------------------------------------------------
//Get Actor Details

const selectedToken = canvas.tokens.controlled[0];
    
    // Check if a token is selected
    if (!selectedToken) {
        ui.notifications.warn("Select a token first!");
        return;
    }
    
    // Get the actor from the selected token
    const actor = selectedToken.actor;
    
    if (!actor) {
        ui.notifications.error("Much like 'The Rock' there is no actor here! (Selected token has no associated actor) ");
        return;
    }

    const SocialDM = actor.system?.characteristics.SOC.dm;

    //get skills for actor
    const skills = actor.system?.skills;
    if (!skills) {
        ui.notifications.error("No skills found on this character! such an NPC!");
        return;
    }

    const skillNames = ["Admin", "Broker", "Carouse", "Steward", "Streetwise"];
    const skillValues = {};
    
    for (const skillId of skillNames) {
        const skill = skills[skillId.toLowerCase()]; // Note: skill keys are lowercase in the system
        if (skill) {
            const skillValue = parseInt(skill.value) || 0;
            const isTrained = skill.trained || false;
            const finalLevel = (skillValue === 0 && !isTrained) ? -3 : skillValue;
            
            // Store in object
            skillValues[skillId] = finalLevel;
        }
    }

    function skillRoll(skillName) {
        // Roll 2d6

        const diceRoll = rollDice(2)
        
        // Get the skill level from our skillValues object
        const skillLevel = skillValues[skillName] || 0;
        const statDM = actor.system?.characteristics[actor.system?.skills[skillName.toLowerCase()]?.default]?.dm || 0;
        const stat = actor.system?.skills[skillName.toLowerCase()]?.default;
        const difficultyLevel = 8;
        //console.log(`SkillName : ${skillName}`)
        //console.log(`Stat : ${stat}`)
        console.log(`skillLevel : ${skillLevel}`)

        //actor.system?.characteristics.SOC.dm;

        // Calculate total (2d6 + skill level + stat DM)
        const total = diceRoll.diceTotal + skillLevel + statDM;
        
        // Return the result object
        return {
            dice: [diceRoll.die[0], diceRoll.die[1]],
            diceTotal: diceRoll.diceTotal,
            skillLevel: skillLevel,
            difficulty : difficultyLevel,
            stat:  stat,
            statDM: statDM,
            total: total, 
            effect : total - difficultyLevel
        };
    }


    //get Skill Values
    //console.log("Skill Values Object:", skillValues);
    //console.log("Skill Values Object:", skillValues.Steward);
    //console.log("SOC" , SocialDM);
    //  const SocialDM = actor.system?.characteristics.SOC.dm;

///TRADE STUFF ------------------------------------------------------------------------------------------
// UWP characteristic names and descriptions
const uwpCharacteristics = [
    { name: "Starport", code: "A", description: "Quality of starport (A-X)" },
    { name: "Size", code: "B", description: "World size (0-A)" },
    { name: "Atmosphere", code: "C", description: "Atmosphere type (0-F)" },
    { name: "Hydrographics", code: "D", description: "Water coverage (0-A)" },
    { name: "Population", code: "E", description: "Population level (0-C)" },
    { name: "Government", code: "F", description: "Government type (0-F)" },
    { name: "Law Level", code: "G", description: "Law level (0-J)" },
    { name: "Tech Level", code: "H", description: "Technology level (0-G+)" }
];

// Convert hex character to number
function hexToNumber(hex) {
    const char = hex.toUpperCase();
    if (char >= '0' && char <= '9') return parseInt(char);
    if (char >= 'A' && char <= 'Z') return char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    return 0;
}

// Get starport quality modifier
function getStarportMod(starport) {
    switch(starport.toUpperCase()) {
        case 'A': return 2;
        case 'B': return 1;
        case 'C': return 0;
        case 'D': return -1;
        case 'E': return -2;
        case 'X': return -3;
        default: return 0;
    }
}

// Parse UWP string into components
function parseUWP(uwpString) {
    const clean = uwpString.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
    const parts = clean.split('-');
    
    if (parts[0].length < 7) return null;
    
    return {
        starport: parts[0][0],
        size: hexToNumber(parts[0][1]),
        atmosphere: hexToNumber(parts[0][2]),
        hydrographics: hexToNumber(parts[0][3]),
        population: hexToNumber(parts[0][4]),
        government: hexToNumber(parts[0][5]),
        lawLevel: hexToNumber(parts[0][6]),
        techLevel: parts[1] ? hexToNumber(parts[1][0]) : 0
    };
}

// Calculate passenger modifiers
function calculatePassengerMods(origin, destination, stewardRank = 0, destZone, originZone, parsecs, effect, skillName) {
    let mods = [];
    
    // Starport modifiers
    const originStarportMod = getStarportMod(origin.starport);
    if (originStarportMod !== 0) mods.push(`Origin Starport ${origin.starport}: ${originStarportMod > 0 ? '+' : ''}${originStarportMod}`);
    
    const destStarportMod = getStarportMod(destination.starport);
    if (destStarportMod !== 0) mods.push(`Destination Starport ${destination.starport}: ${destStarportMod > 0 ? '+' : ''}${destStarportMod}`);
    
    // Population modifiers
    if (origin.population <= 1) mods.push(`Origin Low Pop (${origin.population}): -4`);
    if (destination.population >= 6 && destination.population <= 7) mods.push(`Origin Medium Pop (${origin.population}): +1`);
    if (origin.population >= 8) mods.push(`Destination High Pop (${origin.population}): +3`);
    
    if (destination.population <= 1) mods.push(`Destination Low Pop (${destination.population}): -4`);
    if (destination.population >= 6 && destination.population <= 7) mods.push(`Destination Medium Pop (${destination.population}): +1`);
    if (destination.population >= 8) mods.push(`Destination High Pop (${destination.population}): +3`);
    
    // Zone Logic
    if(destZone === 1 ) mods.push(`Destination Zone : Amber (${destZone}): +1`)                       
        else if(destZone === 2 ) mods.push(`Destination Zone : Red (${destZone}): -4`);
    if(originZone === 1 ) mods.push(`Origin Zone : Amber (${originZone}): +1`)                       
        else if(originZone === 2 ) mods.push(`Origin Zone : Red (${originZone}): -4`);

    mods.push(`Parsecs Travelling ${parsecs+1} : -${parsecs}`)
    mods.push(`${skillName} Roll effect ${effect} : +${effect}`)

    // Government restrictions
    //if (origin.government === 0 || origin.government >= 10) mods.push(`Origin Government (${origin.government}): -1`);
    //if (destination.government === 0 || destination.government >= 10) mods.push(`Destination Government (${destination.government}): -1`);
    
    // Law level restrictions
    //if (origin.lawLevel === 0 || origin.lawLevel >= 9) mods.push(`Origin Law Level (${origin.lawLevel}): -1`);
    //if (destination.lawLevel === 0 || destination.lawLevel >= 9) mods.push(`Destination Law Level (${destination.lawLevel}): -1`);
    
    // Tech level
    //if (origin.techLevel >= 10) mods.push(`Origin High Tech (${origin.techLevel}): +2`);
    //if (destination.techLevel >= 10) mods.push(`Destination High Tech (${destination.techLevel}): +2`);
    
    // Character modifiers
    if (stewardRank !== 0) mods.push(`Steward Rank: ${stewardRank > 0 ? '+' : ''}${stewardRank}`);

    
    return mods;
}


// Calculate freight modifiers
function calculateFreightMods(origin, destination,destZone, originZone, parsecs, effect, skillname) {
    let mods = [];
    
    // Origin starport
    const originStarportMod = getStarportMod(origin.starport);
    if (originStarportMod !== 0) mods.push(`Origin Starport ${origin.starport}: ${originStarportMod > 0 ? '+' : ''}${originStarportMod}`);
    
    // Destination starport
    const destStarportMod = getStarportMod(destination.starport);
    if (destStarportMod !== 0) mods.push(`Destination Starport ${destination.starport}: ${destStarportMod > 0 ? '+' : ''}${destStarportMod}`);
    
    // Population modifiers
    if (origin.population <= 1) mods.push(`Origin Low Pop (${origin.population}): -4`);
    if (origin.population >= 6) mods.push(`Origin High Pop (${origin.population}): +2`);
    if (origin.population >= 9) mods.push(`Origin Very High Pop (${origin.population}): +4`);
    
    if (destination.population <= 1) mods.push(`Destination Low Pop (${destination.population}): -4`);
    if (destination.population >= 6) mods.push(`Destination High Pop (${destination.population}): +2`);
    if (destination.population >= 9) mods.push(`Destination Very High Pop (${destination.population}): +4`);
    
    // Zone Logic
    if(destZone === 1 ) mods.push(`Destination Zone : Amber (${destZone}): -2`)                       
        else if(destZone === 2 ) mods.push(`Destination Zone : Red  (${destZone}): -6`);
    if(originZone === 1 ) mods.push(`Origin Zone : Amber (${originZone}): -2`)                       
        else if(originZone === 2 ) mods.push(`Origin Zone : Red (${originZone}): -6`);

    // Tech level difference

    //const techDiff = Math.abs(origin.techLevel - destination.techLevel);
    //if (techDiff >= 9) mods.push(`Tech Level Difference (${techDiff}): +2`);
    if (origin.techLevel >= 9) mods.push(`Origin High Tech (${origin.techLevel}): +2`);
    if (origin.techLevel <= 6) mods.push(`Origin Low Tech(${origin.techLevel}): -2`);

    if (destination.techLevel >= 9) mods.push(`Destination High Tech (${destination.techLevel}): +2`);
    if (destination.techLevel <= 6) mods.push(`Destination Low Tech (${destination.techLevel}): -2`);
    
    mods.push(`Parsecs Travelling ${parsecs+1} : -${parsecs}`)
    mods.push(`${skillname} Roll effect ${effect} : +${effect}`)
    // Character modifiers
    //if (stewardRank !== 0) mods.push(`Social Standing DM: ${stewardRank > 0 ? '+' : ''}${stewardRank}`);
    //if (socDM !== 0) mods.push(`Social Standing DM: ${socDM > 0 ? '+' : ''}${socDM}`);
    //if (maxRank > 0) mods.push(`Scout/Naval Rank ${maxRank}: +1`);
    return mods;
}

function freightLotSizes()
{

    major = rollDice(1).diceTotal*10;
    console.log(`major ${major}`)
    minor = rollDice(1).diceTotal*5;
    console.log(`minor ${minor}`)
    incidental = rollDice(1).diceTotal;
    console.log(`incidental ${incidental}`)

    return {
        Major : major,
        Minor : minor,
        Incidental : incidental,
    };

}

//Replaced with rollDice fucntion
function roll2d6()
{
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const diceTotal = die1 + die2;

    return {
        diceTotal : diceTotal,
        die1 : die1,
        die2 : die2
    }
}

function rollDice(numberOfDice) {
    const die = [];
    let diceTotal = 0;
    
    for (let i = 0; i < numberOfDice; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        die.push(roll);
        diceTotal += roll;
    }
    
    return {
        diceTotal: diceTotal,
        die: die
    };
}

function calculateAvailable(type, dmValue) {
    const ranges = [
        { DM: 0, Freight: 0, passengers: 0 },
        { DM: 1, Freight: 0, passengers: 0 },
        { DM: 2, Freight: 1, passengers: 1 },
        { DM: 3, Freight: 1, passengers: 1 },
        { DM: 4, Freight: 2, passengers: 2 },
        { DM: 5, Freight: 2, passengers: 2 },
        { DM: 6, Freight: 3, passengers: 2 },
        { DM: 7, Freight: 3, passengers: 3 },
        { DM: 8, Freight: 3, passengers: 3 },
        { DM: 9, Freight: 4, passengers: 3 },
        { DM: 10, Freight: 4, passengers: 3 },
        { DM: 11, Freight: 4, passengers: 4 },
        { DM: 12, Freight: 5, passengers: 4 },
        { DM: 13, Freight: 5, passengers: 4 },
        { DM: 14, Freight: 5, passengers: 5 },
        { DM: 15, Freight: 6, passengers: 5 },
        { DM: 16, Freight: 6, passengers: 6 },
        { DM: 17, Freight: 7, passengers: 7 },
        { DM: 18, Freight: 8, passengers: 8 },
        { DM: 19, Freight: 9, passengers: 9 },
        { DM: 20, Freight: 10, passengers: 10 }
    ];
    
    // Validate type parameter
    if (type !== "Freight" && type !== "passengers") {
        return -1; // or throw an error
    }
    
    // Get value for the specified DM and type
    const index = Math.min(dmValue, ranges.length - 1);
    if (index < 0) return 0;
    if (index > 20) return 10;
    
    return ranges[index][type];
}

// Calculate mail modifiers
function 
calculateMailMods(socDM = 0, maxRank = 0, freightTotal = 0) {
    let mods = [];
    
   // Only A and B class starports get mail
   /* if (origin.starport !== 'A' && origin.starport !== 'B') {
        mods.push(`Origin Starport ${origin.starport}: No Mail Service`);
        return mods;
    }
    if (destination.starport !== 'A' && destination.starport !== 'B') {
        mods.push(`Destination Starport ${destination.starport}: No Mail Service`);
        return mods;
    }
    if (origin.techLevel <=5) mods.push (`Low Tech Level Planet (${origin.techLevel}): -4`);
    // Character modifiers
  */
    if (socDM !== 0) mods.push(`Social Standing DM: ${socDM > 0 ? '+' : ''}${socDM}`);
    if (maxRank >= 1) mods.push(`Naval/Scout Rank ${maxRank}: +${maxRank}`);
    mods.push (`Freight DM : +${freightTotal}`)

    mods.push(`Add Is Ship Armed DM+ here`)
    return mods;
}

function calculateMailAvailable(mailTotal) {}

// Calculate total modifier
function calculateTotal(modifiers) {
    return modifiers.reduce((total, mod) => {
        const match = mod.match(/([+-]\d+)/);
        return total + (match ? parseInt(match[1]) : 0);
    }, 0);
}

// Create the dialog content
let dialogContent = `
<form>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #2c3e50;">Origin World</h3>
            <div style="margin-bottom: 10px;">
                <label for="origin-name"><strong>World Name:</strong></label>
                <input type="text" id="origin-name" style="width: 100%; margin-top: 5px;" placeholder="Enter world name">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="origin-uwp"><strong>UWP:</strong></label>
                <input type="text" id="origin-uwp" style="width: 100%; margin-top: 5px; font-family: monospace; font-size: 14px;" 
                       placeholder="A867A69-C" value="D786799-5" maxlength="10">
            </div>
            <div>
                <label for="origin-zone"><strong>Zone Type:</strong></label>
                <select id="origin-zone" style="width: 100%; margin-top: 5px;">
                    <option value="0">None</option>
                    <option value="1">Amber</option>
                    <option value="2">Red</option>
                </select>
            </div>
            <div id="origin-breakdown" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
        </div>
        <div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #2c3e50;">Destination World</h3>
            <div style="margin-bottom: 10px;">
                <label for="dest-name"><strong>World Name:</strong></label>
                <input type="text" id="dest-name" style="width: 100%; margin-top: 5px;" placeholder="Enter world name">
            </div>
            <div style="margin-bottom: 10px;">
                <label for="dest-uwp"><strong>UWP:</strong></label>
                <input type="text" id="dest-uwp" style="width: 100%; margin-top: 5px; font-family: monospace; font-size: 14px;" 
                       placeholder="C564658-8" value="C564658-8" maxlength="10">
            </div>
            <div>
                <label for="dest-zone"><strong>Zone Type:</strong></label>
                <select id="dest-zone" style="width: 100%; margin-top: 5px;">
                    <option value="0">None</option>
                    <option value="1">Amber</option>
                    <option value="2">Red</option>
                </select>
            </div>
            <div id="dest-breakdown" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
        </div>
    </div>
        <div style="border: 1px solid #8e44ad; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
        <h3 style="margin-top: 0; color: #8e44ad;">Character Modifiers</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <div style="margin-bottom: 15px;">
                    <label for="soc-dm"><strong>Social Standing DM:</strong></label>
                    <br>
                    <small style="font-size: 11px; color: #666;">Character's Social Standing modifier (-3 to +3)</small>
                    <br>
                    <input type="number" id="soc-dm" style="width: 50%; margin-top: 5px;" placeholder="0" value=${SocialDM} min="-3" max="3">
                 </div>
                <div style="margin-bottom: 15px;">
                    <label for="max-rank"><strong>Highest Naval/Scout Rank:</strong></label>
                    <br>
                    <small style="font-size: 11px; color: #666;">Highest achieved rank in Navy, Marines, or Army</small>
                    <br>
                    <select id="max-rank" style="width: 50%; margin-top: 5px;">
                        <option value="0">None</option>
                        <option value="1">Rank 1</option>
                        <option value="2">Rank 2</option>
                        <option value="3">Rank 3</option>
                        <option value="4">Rank 4</option>
                        <option value="5">Rank 5</option>
                        <option value="6">Rank 6+</option>
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="parsec"><strong>Number of Parsecs:</strong></label>
                    <br>
                    <small style="font-size: 11px; color: #666;">Total Number of Parsecs to Travel</small>
                    <br>
                    <input type="number" id="parsec" style="width: 50%; margin-top: 5px;" placeholder="Enter parsecs..." value="1" >
                </div>
            </div>
            <div>
                <div style="margin-bottom: 15px;">
                    <label for="steward-dm"><strong>Steward Skill:</strong></label>
                    <br>
                    <small style="font-size: 11px; color: #666;">Character's Steward Rank modifier (-3 to +3)</small>
                    <br>
                    <input type="number" id="steward-dm" style="width: 50%; margin-top: 5px;" placeholder="0" value=${skillValues.Steward} min="-3" max="3">
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="freight-skill"><strong>Freight Skill:</strong></label>
                    <br>
                    <small style="font-size: 11px; color: #666;">Skill used for freight checks</small>
                    <br>
                    <select id="freight-skill" style="width: 50%; margin-top: 5px;">
                        <option value="Broker">Broker</option>
                        <option value="Streetwise">Streetwise</option>
                        <option value="Admin">Admin</option>
                    </select>
                </div>
                <div style="margin-bottom: 15px;">
                    <label for="passenger-skill"><strong>Passenger Skill:</strong></label>
                    <br>
                    <small style="font-size: 11px; color: #666;">Skill used for passenger checks</small>
                    <br>
                    <select id="passenger-skill" style="width: 50%; margin-top: 5px;">
                        <option value="Steward">Steward</option>
                        <option value="Streetwise">Streetwise</option>
                        <option value="Carouse">Carouse</option>
                    </select>
                    
                </div>
            </div>
        </div>
    </div>
    <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
        <h4 style="margin-top: 0;">UWP Reference:</h4>
        <p style="margin: 5px 0; font-size: 12px;"><strong>Format:</strong> ABCDEFG-H (Starport/Size/Atmosphere/Hydrographics/Population/Government/Law-Tech)</p>
        <p style="margin: 5px 0; font-size: 12px;"><strong>Hex Values:</strong> 0-9=0-9, A=10, B=11, C=12, D=13, E=14, F=15, etc.</p>
    </div>
    <div id="trade-results" style="display: none; border: 2px solid #27ae60; padding: 15px; border-radius: 5px; background-color: #f8fff8;">
        <h3 style="margin-top: 0; color: #27ae60;">Trade Calculation Results</h3>
        <div id="results-content"></div>
    </div>
</form>
`;

// Create and show the dialog
new Dialog({
    title: "Traveller 2e Trade Calculator",
    content: dialogContent,
    buttons: {
        calculate: {
            icon: '<i class="fas fa-calculator"></i>',
            label: "Calculate Trade Modifiers",
            callback: (html) => {
                const originName = html.find("#origin-name")[0].value || "Origin";
                const destName = html.find("#dest-name")[0].value || "Destination";
                const originUWP = html.find("#origin-uwp")[0].value;
                const destUWP = html.find("#dest-uwp")[0].value;
                const parsecs = html.find("#parsec")[0].value -1;
                const freightSkill = html.find("#freight-skill")[0].value ;
                const passengerSkill = html.find("#passenger-skill")[0].value ;

                const origin = parseUWP(originUWP);
                const destination = parseUWP(destUWP);
                
                if (!origin || !destination) {
                    ui.notifications.error("Please enter valid UWP codes for both worlds!");
                    return;
                }

                const socDM = parseInt(html.find("#soc-dm")[0].value) || 0;
                const stewardRank = parseInt(html.find("#steward-dm")[0].value) || 0;
                const maxRank = parseInt(html.find("#max-rank")[0].value) || 0;
                const destZone = parseInt(html.find("#dest-zone")[0].value) || 0;
                const originZone = parseInt(html.find("#origin-zone")[0].value) || 0;
                                
                const freightRoll = skillRoll(freightSkill)
                const passengerRoll = skillRoll(passengerSkill)
                
                const freightMods = calculateFreightMods(origin, destination, destZone, originZone, parsecs, freightRoll.effect,freightSkill );
                const freightTotal = calculateTotal(freightMods);
                const mailMods = calculateMailMods(socDM, maxRank, freightTotal);
                const mailTotal = calculateTotal(mailMods);
                const passengerMods = calculatePassengerMods(origin, destination, stewardRank, destZone, originZone, parsecs, passengerRoll.effect,passengerSkill);
                const passengerTotal = calculateTotal(passengerMods);
                const freightSizes = freightLotSizes()

                const test = calculateAvailable("Freight",freightRoll.effect -4 + freightTotal)
                console.log(`test ${test}`)
                
                const test2 = calculateAvailable("Freight",9)
                console.log(`test ${test2}`)

                console.log(`F: ${freightRoll.total}`)
                console.log(`P: ${passengerRoll.total}`)

               // const Availability = calculateAvailable(freightTotalAfterRoll, passengerTotalAfterRoll);

                let resultsHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <h4>${originName}</h4>
                            <div style="font-family: monospace; font-size: 14px; margin-bottom: 5px;">UWP: ${originUWP}</div>
                            <div style="font-size: 12px;">
                                Starport: ${origin.starport}, <br> Size: ${origin.size},<br> Atmosphere: ${origin.atmosphere}, <br> Hydrographics: ${origin.hydrographics},<br>
                                Population: ${origin.population}, <br> Government: ${origin.government}, <br> Law: ${origin.lawLevel}, <br> Tech: ${origin.techLevel}
                            </div>
                        </div>
                        <div>
                            <h4>${destName}</h4>
                            <div style="font-family: monospace; font-size: 14px; margin-bottom: 5px;">UWP: ${destUWP}</div>
                            <div style="font-size: 12px;">
                                Starport: ${destination.starport}, <br> Size: ${destination.size}, <br> Atmosphere: ${destination.atmosphere}, <br> Hydrographics: ${destination.hydrographics}, <br>
                                Population: ${destination.population}, <br> Government: ${destination.government}, <br> Law: ${destination.lawLevel}, <br> Tech: ${destination.techLevel}
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 15px;">

                    <!-- Skills Block -->
                    <div style="border: 1px solid #95a5a6; padding: 10px; border-radius: 5px;">
                        <h4 style="margin-top: 0; color: #95a5a6;">Skills</h4>
                        <div style="font-size: 12px;">
                            Freight Skill :<strong>${freightSkill}</strong><br> 
                            Dice : ${freightRoll.dice}<br>
                            Difficulty : ${freightRoll.difficulty} <br>
                            ${freightSkill} DM +${freightRoll.skillLevel}<br>
                            ${freightRoll.stat} DM+${freightRoll.statDM}<br>
                            Total Effect ${freightRoll.effect}<br>
                            Passenger Skill :<strong>${passengerSkill}</strong><br>
                            Dice : ${passengerRoll.dice}<br>
                            Difficulty : ${passengerRoll.difficulty} <br>
                            ${passengerSkill} DM +${passengerRoll.skillLevel}<br>
                            ${passengerRoll.stat} DM+${passengerRoll.statDM}<br>
                            Total Effect : ${passengerRoll.effect}
                        </div>
                    </div>

                        <!-- Freight Skill Block
                    <div style="border: 1px solid #3498db; padding: 10px; border-radius: 5px;">
                        <h4 style="margin-top: 0; color: #3498db;">${freightSkill}</h4>
                        <div style="font-size: 12px;">
                            Dice : ${freightRoll.dice}<br>
                            ${freightSkill} DM +${freightRoll.skillLevel}<br>
                            ${freightRoll.stat} DM+${freightRoll.statDM}<br>
                            Total ${freightRoll.effect}
                        </div>
                    </div>
                     -->

                    <!-- Passenger Skill Block 
                    <div style="border: 1px solid #e74c3c; padding: 10px; border-radius: 5px;">
                        <h4 style="margin-top: 0; color: #e74c3c;">${passengerSkill}</h4>
                        <div style="font-size: 12px;">
                            Dice : ${passengerRoll.dice}<br>
                            ${passengerSkill} DM +${passengerRoll.skillLevel}<br>
                            ${passengerRoll.stat} DM+${passengerRoll.statDM}<br>
                            Total ${passengerRoll.effect}
                        </div>
                    </div>
                    -->

                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="border: 1px solid #3498db; padding: 10px; border-radius: 5px;">
                            <h4 style="margin-top: 0; color: #3498db;">Freight</h4>
                            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                                Total Modifier: ${freightTotal >= 0 ? '+' : ''}${freightTotal}
                            </div>
                            <div style="font-size: 12px;">
                                ${freightMods.length > 0 ? freightMods.join('<br>') : 'No modifiers'}
                            </div>
                        </div>
                        
                        <div style="border: 1px solid #e74c3c; padding: 10px; border-radius: 5px;">
                            <h4 style="margin-top: 0; color: #e74c3c;">Mail</h4>
                            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                                Total Modifier: ${mailTotal >= 0 ? '+' : ''}${mailTotal}
                            </div>
                            <div style="font-size: 12px;">
                                ${mailMods.length > 0 ? mailMods.join('<br>') : 'No modifiers'}
                            </div>
                        </div>
                        
                        <div style="border: 1px solid #f39c12; padding: 10px; border-radius: 5px;">
                            <h4 style="margin-top: 0; color: #f39c12;">Passengers</h4>
                            <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                                Total Modifier: ${passengerTotal >= 0 ? '+' : ''}${passengerTotal}
                            </div>
                            <div style="font-size: 12px;">
                                ${passengerMods.length > 0 ? passengerMods.join('<br>') : 'No modifiers'}
                            </div>
                        </div>
                    </div>
                    
                   
    <!-- Route Block 
    <div style="border: 1px solid #95a5a6; padding: 10px; border-radius: 5px;">
        <h4 style="margin-top: 0; color: #95a5a6;">Route</h4>
        <div style="font-size: 12px;">
            <strong>${originName}</strong> → <strong>${destName}</strong>
        </div>
    </div>
    -->

    <!-- Freight Block -->
    <div style="border: 1px solid #3498db; padding: 10px; border-radius: 5px;">
        <h4 style="margin-top: 0; color: #3498db;">Freight</h4>
        <div style="font-size: 12px;">
            <strong>Major Cargo:</strong><br>
            FreightDM ${freightTotal} + Major ${-4}  : ${ freightTotal -4}<br>
            Available lots : ${calculateAvailable("Freight",freightTotal -4 )}*${freightSizes.Major} Ton Lots <br>
            <strong>Minor Cargo :</strong><br>
            FreightDM ${freightTotal} + Minor ${0}  : ${ freightTotal -0}<br>
            Available lots : ${calculateAvailable("Freight",freightTotal )}*${freightSizes.Minor} Ton Lots<br>
            <strong>Incidental Cargo :</strong><br>
            FreightDM ${freightTotal} + Incidental ${+2}  : ${ freightTotal +2}<br>
            Available lots : ${calculateAvailable("Freight",freightTotal +2 )}*${freightSizes.Incidental} Ton Lots
        </div>
    </div>

    <!-- Mail Block -->
    <div style="border: 1px solid #e74c3c; padding: 10px; border-radius: 5px;">
        <h4 style="margin-top: 0; color: #e74c3c;">Mail</h4>
        <div style="font-size: 12px;">
            <strong>Mail (5 ton lots):</strong><br>
            (no skill)<br>
            2d6${mailTotal >= 0 ? '+' : ''}${mailTotal}
        </div>
    </div>

    <!-- Passengers Block -->
    <div style="border: 1px solid #f39c12; padding: 10px; border-radius: 5px;">
        <h4 style="margin-top: 0; color: #f39c12;">Passengers</h4>
        <div style="font-size: 12px;">
            <strong>High:</strong> ${passengerSkill}: Roll Effect: +${passengerRoll.effect}, + PassengerDM ${passengerTotal} HighDM: +${-4} : ${passengerRoll.effect + passengerTotal -4}<br>
            <strong>Medium:</strong>  ${passengerSkill}: Roll Effect: +${passengerRoll.effect}, + PassengerDM ${passengerTotal} MediumDM: +${0} : ${passengerRoll.effect + passengerTotal }<br>
            <strong>Basic:</strong>  ${passengerSkill}: Roll Effect: +${passengerRoll.effect}, + PassengerDM ${passengerTotal} BasicDM: +${0} : ${passengerRoll.effect + passengerTotal }<br>
            <strong>Low:</strong>  ${passengerSkill}: Roll Effect: +${passengerRoll.effect}, + PassengerDM ${passengerTotal} LowDM: +${+2} : ${passengerRoll.effect + passengerTotal +2}<br>
        </div>
    </div>
                `;
             // #1abc9c  final output colour   
                // Create chat message
                const chatData = {
                    user: game.user.id,
                    content: `
                        <div style="border: 2px solid #2c3e50; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                            <h3 style="margin-top: 0; color: #2c3e50;"> Trade Route Analysis</h3>
                            ${resultsHTML}
                        </div>
                    `
                };
                
                ChatMessage.create(chatData);
                ui.notifications.info("Trade modifiers calculated and posted to chat!");
            }
        },
        cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
        }
    },
    default: "calculate",
    render: (html) => {
        // Function to update breakdown display
        function updateBreakdown(uwpInput, breakdownDiv) {
            const uwp = parseUWP(uwpInput.value);
            if (uwp) {
                breakdownDiv.innerHTML = `
                    <strong>Decoded:</strong><br>
                    Starport: ${uwp.starport}, Size: ${uwp.size}, Atmosphere: ${uwp.atmosphere}, Hydrographics: ${uwp.hydrographics}<br>
                    Population: ${uwp.population}, Government: ${uwp.government}, Law: ${uwp.lawLevel}, Tech: ${uwp.techLevel}
                `;
            } else {
                breakdownDiv.innerHTML = '';
            }
        }
        
        // Add event listeners for real-time UWP breakdown
        const originUWP = html.find("#origin-uwp")[0];
        const destUWP = html.find("#dest-uwp")[0];
        const originBreakdown = html.find("#origin-breakdown")[0];
        const destBreakdown = html.find("#dest-breakdown")[0];
        
        originUWP.addEventListener("input", () => updateBreakdown(originUWP, originBreakdown));
        destUWP.addEventListener("input", () => updateBreakdown(destUWP, destBreakdown));
        
        // Auto-uppercase UWP inputs
        [originUWP, destUWP].forEach(input => {
            input.addEventListener("input", (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        });
    }
}, {
    width: 800,
    height: 600,
    resizable: true
}).render(true);


