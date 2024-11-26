"use client";
// page.jsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import _ from 'lodash';

// Sample recipe data
const DEFAULT_RECIPES = {
  sourdough: {
    name: 'Sourdough Bread',
    totalTime: 24,
    steps: [
      { name: 'Feed Starter', duration: 8, type: 'preparation' },
      { name: 'Autolyse', duration: 1, type: 'waiting' },
      { name: 'Mixing', duration: 0.5, type: 'active' },
      { name: 'Bulk Fermentation', duration: 4, type: 'waiting' },
      { name: 'Shaping', duration: 0.5, type: 'active' },
      { name: 'Proofing', duration: 8, type: 'waiting' },
      { name: 'Baking', duration: 1, type: 'active' },
    ],
  },
  baguette: {
    name: 'Baguette',
    totalTime: 6,
    steps: [
      { name: 'Mixing', duration: 0.5, type: 'active' },
      { name: 'First Rise', duration: 2, type: 'waiting' },
      { name: 'Shaping', duration: 0.5, type: 'active' },
      { name: 'Second Rise', duration: 1, type: 'waiting' },
      { name: 'Baking', duration: 0.5, type: 'active' },
    ],
  },
  wholewheat: {
    name: 'Whole Wheat Bread',
    totalTime: 4,
    steps: [
      { name: 'Mixing', duration: 0.33, type: 'active' },
      { name: 'Kneading', duration: 0.25, type: 'active' },
      { name: 'First Rise', duration: 1.5, type: 'waiting' },
      { name: 'Shaping', duration: 0.25, type: 'active' },
      { name: 'Second Rise', duration: 1, type: 'waiting' },
      { name: 'Baking', duration: 0.66, type: 'active' },
    ],
  },
};

const BreadCalculator = () => {
  const [recipes, setRecipes] = useState(DEFAULT_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [targetTime, setTargetTime] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [error, setError] = useState('');
  const [isCreatingRecipe, setIsCreatingRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    steps: [{ name: '', duration: 0, type: 'active' }],
  });

  // Load saved recipes from localStorage
  useEffect(() => {
    const savedRecipes = localStorage.getItem('recipes');
    if (savedRecipes) {
      setRecipes({ ...DEFAULT_RECIPES, ...JSON.parse(savedRecipes) });
    }
  }, []);

  // Save recipes to localStorage
  useEffect(() => {
    const customRecipes = _.omit(recipes, Object.keys(DEFAULT_RECIPES));
    localStorage.setItem('recipes', JSON.stringify(customRecipes));
  }, [recipes]);

  const calculateSchedule = (endTimeStr) => {
    if (!endTimeStr || !selectedRecipe) {
      setError('Please select a recipe and target completion time');
      return;
    }

    const endTime = new Date(endTimeStr);

    if (isNaN(endTime)) {
      setError('Invalid date format');
      return;
    }

    const recipe = recipes[selectedRecipe];
    const steps = [...recipe.steps].reverse();
    let currentTime = new Date(endTime);
    const schedule = [];

    steps.forEach((step) => {
      const startTime = new Date(currentTime.getTime() - step.duration * 60 * 60 * 1000);
      schedule.unshift({
        ...step,
        startTime,
        endTime: new Date(currentTime),
      });
      currentTime = startTime;
    });

    setSchedule(schedule);
    setError('');
  };

  const handleTimeChange = (e) => {
    const value = e.target.value;
    setTargetTime(value);
    calculateSchedule(value);
  };

  const handleRecipeSelect = (key) => {
    setSelectedRecipe(key);
    setTargetTime('');
    setSchedule([]);
  };

  const addStep = () => {
    setNewRecipe((prev) => ({
      ...prev,
      steps: [...prev.steps, { name: '', duration: 0, type: 'active' }],
    }));
  };

  const removeStep = (index) => {
    setNewRecipe((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const updateStep = (index, field, value) => {
    setNewRecipe((prev) => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, [field]: field === 'duration' ? parseFloat(value) || 0 : value } : step
      ),
    }));
  };

  const saveNewRecipe = () => {
    if (!newRecipe.name || newRecipe.steps.some((step) => !step.name)) {
      setError('Please fill in all recipe fields');
      return;
    }

    const recipeId = newRecipe.name.toLowerCase().replace(/\s+/g, '-');
    setRecipes((prev) => ({
      ...prev,
      [recipeId]: {
        ...newRecipe,
        totalTime: newRecipe.steps.reduce((sum, step) => sum + step.duration, 0),
      },
    }));
    setSelectedRecipe(recipeId);
    setIsCreatingRecipe(false);
    setNewRecipe({ name: '', steps: [{ name: '', duration: 0, type: 'active' }] });
  };

  const exportToCalendar = () => {
    if (!schedule.length) return;

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'CALSCALE:GREGORIAN',
      ...schedule
        .map((step) => [
          'BEGIN:VEVENT',
          `SUMMARY:${recipes[selectedRecipe].name} - ${step.name}`,
          `DTSTART:${step.startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTEND:${step.endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          'END:VEVENT',
        ])
        .flat(),
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${recipes[selectedRecipe].name.toLowerCase()}-schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Bread Recipe Timer
      </Typography>

      {/* Recipe Tiles */}
      {!selectedRecipe && !isCreatingRecipe && (
        <>
          <Grid container spacing={2}>
            {Object.entries(recipes).map(([key, recipe]) => (
              <Grid item xs={12} sm={6} md={4} key={key}>
                <Card>
                  <CardActionArea onClick={() => handleRecipeSelect(key)}>
                    <CardContent>
                      <Typography variant="h6">{recipe.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Time: {recipe.totalTime} hours
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardActionArea onClick={() => setIsCreatingRecipe(true)}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <AddIcon fontSize="large" color="primary" />
                    <Typography variant="h6">Add New Recipe</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Recipe Details and Time Selection */}
      {selectedRecipe && !isCreatingRecipe && (
        <>
          <Button variant="text" onClick={() => setSelectedRecipe(null)} sx={{ mt: 2 }}>
            Back to Recipes
          </Button>
          <Typography variant="h5" sx={{ mt: 2 }}>
            {recipes[selectedRecipe].name}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Total Time: {recipes[selectedRecipe].totalTime} hours
          </Typography>

          <TextField
            label="Target Completion Time"
            type="datetime-local"
            value={targetTime}
            onChange={handleTimeChange}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{
              shrink: true,
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Schedule Display */}
          {schedule.length > 0 && (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={exportToCalendar}
                sx={{ mb: 2 }}
              >
                Export to Calendar
              </Button>
              <Grid container spacing={2}>
                {schedule.map((step, index) => (
                  <Grid item xs={12} key={index}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">{step.name}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {formatTime(step.startTime)} - {formatTime(step.endTime)}
                        </Typography>
                        <Typography variant="body2">
                          Duration: {step.duration} hour{step.duration !== 1 ? 's' : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </>
      )}

      {/* Recipe Creation Dialog */}
      {isCreatingRecipe && (
        <Dialog open={isCreatingRecipe} onClose={() => setIsCreatingRecipe(false)} fullWidth>
          <DialogTitle>Create New Recipe</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              label="Recipe Name"
              value={newRecipe.name}
              onChange={(e) => setNewRecipe((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
              sx={{ mb: 2 }}
            />
            <Typography variant="h6">Steps</Typography>
            {newRecipe.steps.map((step, index) => (
              <Grid container spacing={1} alignItems="center" key={index} sx={{ mb: 1 }}>
                <Grid item xs={4}>
                  <TextField
                    label="Step Name"
                    value={step.name}
                    onChange={(e) => updateStep(index, 'name', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Duration (hrs)"
                    type="number"
                    value={step.duration}
                    onChange={(e) => updateStep(index, 'duration', e.target.value)}
                    fullWidth
                    inputProps={{ step: '0.25', min: '0' }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Type"
                    select
                    value={step.type}
                    onChange={(e) => updateStep(index, 'type', e.target.value)}
                    fullWidth
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="waiting">Waiting</MenuItem>
                    <MenuItem value="preparation">Preparation</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={2}>
                  <IconButton color="error" onClick={() => removeStep(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button
              variant="text"
              startIcon={<AddIcon />}
              onClick={addStep}
              sx={{ mt: 1 }}
            >
              Add Step
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreatingRecipe(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={saveNewRecipe}
            >
              Save Recipe
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default BreadCalculator;
