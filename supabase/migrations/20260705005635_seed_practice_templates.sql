/*
# Seed Practice Templates

Inserts 6 starter practice templates with full starter code files.
These cover beginner to advanced levels across HTML, CSS, JavaScript, and
full-stack categories. Each template includes instructions and starter files
that get copied into a real project when a user starts practice.

Templates:
1. Personal Portfolio Page (HTML/CSS, beginner)
2. Responsive Landing Page (CSS, beginner)
3. Interactive Todo List (JavaScript, beginner)
4. Calculator App (JavaScript, intermediate)
5. Weather Dashboard (JavaScript, intermediate)
6. Blog Homepage (Full Stack, advanced)
*/

-- Template 1: Personal Portfolio Page
INSERT INTO public.practice_templates (title, description, category, difficulty, instructions, estimated_time, skills, is_published, created_by)
VALUES (
  'Personal Portfolio Page',
  'Build a clean personal portfolio page with your photo, bio, skills, and project showcase. Learn HTML structure and CSS styling fundamentals.',
  'html',
  'beginner',
  'Steps:
1. Open index.html and add your name as the page title
2. In the body, create a header section with your photo and name
3. Add an "About Me" section with a short bio
4. Add a "Skills" section listing your skills
5. Add a "Projects" section with 3 project cards
6. Use style.css to style everything — colors, fonts, spacing
7. Make sure the page looks good on mobile too',
  '45 min',
  ARRAY['HTML Structure', 'CSS Selectors', 'Flexbox', 'Responsive Design'],
  true,
  null
)
ON CONFLICT DO NOTHING;

-- Template 2: Responsive Landing Page
INSERT INTO public.practice_templates (title, description, category, difficulty, instructions, estimated_time, skills, is_published, created_by)
VALUES (
  'Responsive Landing Page',
  'Create a beautiful landing page for a fictional product. Practice CSS Grid, Flexbox, and responsive design breakpoints.',
  'css',
  'beginner',
  'Steps:
1. Build a hero section with a big headline and call-to-action button
2. Add a features section with 3 columns (use CSS Grid)
3. Add a testimonials section
4. Add a footer with links
5. Make it responsive: 3 columns on desktop, 1 column on mobile
6. Add hover effects on buttons and cards',
  '1 hour',
  ARRAY['CSS Grid', 'Flexbox', 'Media Queries', 'Hover Effects'],
  true,
  null
)
ON CONFLICT DO NOTHING;

-- Template 3: Interactive Todo List
INSERT INTO public.practice_templates (title, description, category, difficulty, instructions, estimated_time, skills, is_published, created_by)
VALUES (
  'Interactive Todo List',
  'Build a working todo list app. Add tasks, mark them complete, delete tasks, and filter by status. Learn DOM manipulation and event handling.',
  'javascript',
  'beginner',
  'Steps:
1. Create an input field and "Add" button in HTML
2. When the user clicks Add, create a new todo item in the list
3. Each todo has a checkbox — clicking it marks the item as done (strikethrough)
4. Each todo has a delete button to remove it
5. Add filter buttons: All, Active, Completed
6. Show a count of remaining tasks
7. Bonus: Save tasks to localStorage so they persist on reload',
  '1 hour',
  ARRAY['DOM Manipulation', 'Event Listeners', 'Array Methods', 'localStorage'],
  true,
  null
)
ON CONFLICT DO NOTHING;

-- Template 4: Calculator App
INSERT INTO public.practice_templates (title, description, category, difficulty, instructions, estimated_time, skills, is_published, created_by)
VALUES (
  'Calculator App',
  'Build a fully functional calculator. Handle numbers, operators, decimal points, clear, and equals. Practice JavaScript logic and state management.',
  'javascript',
  'intermediate',
  'Steps:
1. Create a calculator grid layout with number buttons 0-9
2. Add operator buttons: +, -, *, /
3. Add Clear (C), Equals (=), and decimal (.) buttons
4. Show the current calculation on a display screen
5. When Equals is clicked, compute the result and display it
6. Handle edge cases: division by zero, multiple operators
7. Add keyboard support: type numbers and operators on your keyboard
8. Style it to look like a real calculator',
  '2 hours',
  ARRAY['JavaScript Logic', 'State Management', 'Keyboard Events', 'CSS Grid'],
  true,
  null
)
ON CONFLICT DO NOTHING;

-- Template 5: Weather Dashboard
INSERT INTO public.practice_templates (title, description, category, difficulty, instructions, estimated_time, skills, is_published, created_by)
VALUES (
  'Weather Dashboard',
  'Build a weather dashboard UI with current conditions, 5-day forecast cards, and a search bar. Practice API integration patterns and dynamic UI updates.',
  'javascript',
  'intermediate',
  'Steps:
1. Create a search bar where users type a city name
2. Create a current weather card showing: city, temperature, condition, icon
3. Create 5 forecast cards in a row
4. Add a temperature unit toggle (C/F)
5. Use the mock data in script.js to display weather
6. Style with a modern weather-app look — gradients, cards, icons
7. Bonus: Add a loading spinner while "fetching" data',
  '2 hours',
  ARRAY['API Patterns', 'Dynamic Rendering', 'Event Handling', 'CSS Animations'],
  true,
  null
)
ON CONFLICT DO NOTHING;

-- Template 6: Blog Homepage
INSERT INTO public.practice_templates (title, description, category, difficulty, instructions, estimated_time, skills, is_published, created_by)
VALUES (
  'Blog Homepage',
  'Build a complete blog homepage with a featured post, post grid, sidebar, and newsletter signup. Practice full-stack layout patterns and component thinking.',
  'fullstack',
  'advanced',
  'Steps:
1. Build a navigation bar with logo and menu links
2. Create a featured post hero section with large image and title
3. Build a post grid with 6 blog post cards (image, title, excerpt, date, author)
4. Add a sidebar with: categories list, popular posts, newsletter signup form
5. Add a footer with social links and copyright
6. Make the entire page fully responsive
7. Add smooth scroll and subtle animations on scroll
8. Bonus: Add a dark mode toggle',
  '3 hours',
  ARRAY['CSS Grid', 'Flexbox', 'Responsive Design', 'Animations', 'Component Layout'],
  true,
  null
)
ON CONFLICT DO NOTHING;
