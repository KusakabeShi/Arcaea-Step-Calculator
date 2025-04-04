import React, { useState, useEffect } from "react";
import { Container, TextField, Button, Slider, FormControlLabel, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, Collapse, IconButton, TableSortLabel } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Cookies from "js-cookie";

const worldBoostMarks = [
  { value: 0, label: "0" },
  { value: 1, label: "20" },
  { value: 2, label: "25" },
  { value: 3, label: "30" }
];

const worldBoostValues = [0, 20, 25, 30]; // Map slider positions to world boost values

const ArcaeaStepCalculator = () => {
  const [stepMin, setStepMin] = useState(12);  // Default value for Step Min
  const [stepMax, setStepMax] = useState(14);  // Default value for Step Max
  const [stepValue, setStepValue] = useState(80);  // Default value for Partner's STEP
  const [worldBoost, setWorldBoost] = useState(0);
  const [additionalBoostMultiplier, setAdditionalBoostMultiplier] = useState(1); // Default value is 1
  const [songPacks, setSongPacks] = useState({});
  const [selectedPacks, setSelectedPacks] = useState({});
  const [results, setResults] = useState([]);
  const [openSections, setOpenSections] = useState({}); // Track which sections are open
  const [sortConfig, setSortConfig] = useState({ key: "NONE", direction: "asc" });
  const [loadedFromCookie, setLoadedFromCookie] = useState(false);

  useEffect(() => {
    const saved = Cookies.get("arcaea_settings");
    let parsed = {};
    let savedSelectedPacks = {};
    if (saved) {
      parsed = JSON.parse(saved);
      //console.log("Load cookie",parsed);
      setStepMin(parsed.stepMin ?? stepMin);
      setStepMax(parsed.stepMax ?? stepMax);
      setStepValue(parsed.stepValue ?? stepValue);
      setWorldBoost(parsed.worldBoost ?? worldBoost);
      setAdditionalBoostMultiplier(parsed.additionalBoostMultiplier ?? additionalBoostMultiplier);
      savedSelectedPacks = parsed.selectedPacks ?? {};
    }
    fetch("/base_potential.json")
      .then((res) => res.json())
      .then((data) => {
        setSongPacks(data);
        // Construct new selectedPacks aligned with latest songPacks
        setSelectedPacks(Object.keys(data).reduce((acc, section) => {
          Object.keys(data[section]).forEach(pack => {
            const key = `${section}-${pack}`;
            if (savedSelectedPacks.hasOwnProperty(key)) {
              acc[key] = savedSelectedPacks[key];
            } else {
              acc[key] = pack === "Arcaea";
            }
          });
          return acc;
        }, {}));
      });
    
    
    
    setLoadedFromCookie(true);


  }, []);

  useEffect(() => {
  if (!loadedFromCookie) return;
  const settings = {
    stepMin,
    stepMax,
    stepValue,
    worldBoost,
    additionalBoostMultiplier,
    selectedPacks,
  };
  //console.log("Save cookie",settings);
  Cookies.set("arcaea_settings", JSON.stringify(settings), { expires: 30 }); // expires in 30 days
}, [stepMin, stepMax, stepValue, worldBoost, additionalBoostMultiplier, selectedPacks]);

  const handlePackChange = (section, pack) => {
    setSelectedPacks((prev) => ({ ...prev, [`${section}-${pack}`]: !prev[`${section}-${pack}`] }));
  };

  const handleSelectAll = (section, packs) => {
    const allSelected = Object.keys(packs).every((pack) => selectedPacks[`${section}-${pack}`]);
    const newSelection = {};
    Object.keys(packs).forEach((pack) => {
      newSelection[`${section}-${pack}`] = !allSelected;
    });
    setSelectedPacks((prev) => ({ ...prev, ...newSelection }));
  };

  const handleSectionToggle = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const calculateResults = (sortDirection) => {
    let filteredResults = [];
    const worldBoostMultiplier = (1 + worldBoost / 100) * additionalBoostMultiplier;
    const userStepMin = stepMin / worldBoostMultiplier;
    const userStepMax = stepMax / worldBoostMultiplier;
    const scorePotentialMin = Math.pow((Math.max(userStepMin * (50 / stepValue) - 2.5,0) / 2.45), 2);
    const scorePotentialMax = ((userStepMax * (50 / stepValue) - 2.5) >= 0)? Math.pow((Math.max(userStepMax * (50 / stepValue) - 2.5,0) / 2.45), 2) : -1;
    Object.entries(songPacks).forEach(([section, packs]) => {
      Object.entries(packs).forEach(([pack, songs]) => {
        if (!selectedPacks[`${section}-${pack}`]) return;
        if(stepMax < stepMin) return;

        Object.entries(songs).forEach(([song, difficulties]) => {
          let row = { song };
          let valid = false;

          difficulties.forEach((diff) => {
            const [diffName, basePotential] = Object.entries(diff)[0];
            if (basePotential >= scorePotentialMin - 2) {
              if ((basePotential + 2) >= scorePotentialMin) {
                const minScore = reverseScorePotential(scorePotentialMin, basePotential);
                const maxScore = reverseScorePotential(scorePotentialMax, basePotential);
                row[diffName] = {
                  score: `${minScore} ~ ${maxScore !== "too_large" ? maxScore : "10000000"}`,
                  base: basePotential
                };

                if (maxScore != "too_small"){
                    valid = true;
                }
              } else {
                row[diffName] = "";
              }
            } else {
              row[diffName] = {
                  score: "❌",
                  base: basePotential
                } ; // If the target step is not achievable
            }
          });

          if (valid) filteredResults.push(row);
        });
      });
    });
    if(sortDirection.key !== "NONE"){
      filteredResults.sort((a, b) => {
        const key = sortDirection.key;
        const dir = sortDirection.direction === "asc" ? 1 : -1;
      
        const aHasBase = a[key]?.base !== undefined;
        const bHasBase = b[key]?.base !== undefined;
      
        // Always push undefined base values to the bottom
        if (!aHasBase && !bHasBase) return 0;
        if (!aHasBase) return 1;
        if (!bHasBase) return -1;
      
        const aVal = a[key].base;
        const bVal = b[key].base;
      
        return (aVal - bVal) * dir;
      });
    }
    setResults(filteredResults);
  };

  const reverseScorePotential = (target, base) => {
    if (target > base + 2) return "too_large";
    if (target < 0) return "too_small"
    if (target > base + 1) return (9800000 + (target - (base + 1)) * 200000).toFixed(0);
    if (target > 0) return (9500000 + (target - base) * 300000).toFixed(0);
    return "0";
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Arcaea Step Calculator</Typography>
      <Box display="flex" alignItems="center" gap={2}>
        <TextField label="Step Min" type="number" value={stepMin} onChange={(e) => setStepMin(parseFloat(e.target.value))} />
        <TextField label="Step Max" type="number" value={stepMax} onChange={(e) => setStepMax(parseFloat(e.target.value))} />
        <TextField label="Partner's STEP" type="number" value={stepValue} onChange={(e) => setStepValue(parseFloat(e.target.value))} />
        <Box width={200}>
          <Typography>World Boost</Typography>
          <Slider
            marks={worldBoostMarks}
            step={null}
            min={0}
            max={3}
            value={worldBoostValues.indexOf(worldBoost)}
            onChange={(e, val) => setWorldBoost(worldBoostValues[val])}
          />
        </Box>
        <TextField
          label="Additional Boost Multiplier"
          type="number"
          value={additionalBoostMultiplier}
          onChange={(e) => setAdditionalBoostMultiplier(parseFloat(e.target.value) || 1)}
          inputProps={{ step: 0.1, min: 1.0 }}
        />
      </Box>
      <Button variant="contained" onClick={() => calculateResults({ key: "NONE", direction: "desc" })}>Calculate</Button>

      <Typography variant="h6">Allowed Song Packs</Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        {Object.entries(songPacks).map(([section, packs]) => (
          <Box key={section} display="flex" flexDirection="column">
            <Box display="flex" alignItems="center">
              <Typography variant="h6" onClick={() => handleSectionToggle(section)} sx={{ cursor: "pointer" }}>
                {section}
              </Typography>
              <IconButton onClick={() => handleSectionToggle(section)}>
                <ExpandMoreIcon />
              </IconButton>
              <FormControlLabel
  control={
    <Checkbox
      checked={Object.keys(packs).every(pack => selectedPacks[`${section}-${pack}`])} // All selected
      indeterminate={
        Object.keys(packs).some(pack => selectedPacks[`${section}-${pack}`]) && 
        !Object.keys(packs).every(pack => selectedPacks[`${section}-${pack}`])
      } // Some selected, but not all
      onChange={() => handleSelectAll(section, packs)}
    />
  }
  label="Select All"
/>
            </Box>
            <Collapse in={openSections[section]}>
              <Box display="flex" flexWrap="wrap" flexDirection="center" gap={0.5}>
                {Object.keys(packs).map((pack) => (
                  <FormControlLabel
                    key={pack}
                    control={<Checkbox checked={selectedPacks[`${section}-${pack}`]} onChange={() => handlePackChange(section, pack)} />}
                    label={pack}
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        ))}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Song</TableCell>
              {["PST", "PRS", "FTR", "ETR", "BYD"].map((diff) => (
                <TableCell key={diff}>
                  <TableSortLabel
                    onClick={() => {
                      let newSortConfig = {
                        key: diff,
                        direction: sortConfig.key === diff ? ( sortConfig.direction === "asc" ? "desc":"asc") : sortConfig.direction
                      };
                      setSortConfig(prev => (newSortConfig));
                      calculateResults(newSortConfig);
                    }}
                    active={sortConfig.key === diff}
                    direction={sortConfig.key === diff ? sortConfig.direction : 'asc'}
                  >
                    {diff}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.song}</TableCell>
              {["PST", "PRS", "FTR", "ETR", "BYD"].map((diff) => (
                <TableCell key={diff}>
                  {row[diff] ? (
                    <Box display="flex" flexDirection="column">
                      <Typography variant="body2" color="textSecondary">{row[diff].base}</Typography>
                      <Typography variant="caption">{row[diff].score}</Typography>
                    </Box>
                  ) : (
                    "➖"
                  )}
                </TableCell>
              ))}
            </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
        <Box mt={4} textAlign="center">
        <Typography variant="body2" color="textSecondary">
          <a
            href="https://github.com/KusakabeShi/Arcaea-Step-Calculator"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            View on GitHub
          </a>
        </Typography>
      </Box>
    </Container>
  );
};

export default ArcaeaStepCalculator;
