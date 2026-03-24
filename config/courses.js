const courses = {
  tkp: {
    id: 'tkp',
    name: 'Team Kanban Practitioner',
    acronym: 'TKP',
    level: 'Beginner',
    duration: '1 day',
    price: 'Contact for pricing',
    icon: 'fa-users',
    color: '#6b46c1',
    shortDescription: 'Your entry point into the world of Kanban. Learn to visualize work, limit WIP, and improve team flow.',
    description: 'The Team Kanban Practitioner (TKP) class is the entry-level Kanban training designed for team members and anyone looking to learn about Kanban. This course teaches the fundamental principles of the Kanban Method and how to apply them immediately in your work environment.',
    audience: [
      'Team members new to Kanban',
      'Scrum Masters and Agile Coaches',
      'Project Managers seeking better flow',
      'Anyone wanting to improve team productivity'
    ],
    outcomes: [
      'Understand the core principles of the Kanban Method',
      'Design and implement a Kanban board for your team',
      'Apply Work-in-Progress (WIP) limits effectively',
      'Identify and manage bottlenecks in your workflow',
      'Use metrics to drive continuous improvement'
    ],
    curriculum: [
      { title: 'Module 1: What is Kanban?', topics: ['History and evolution', 'Core principles', 'Kanban vs other methods'] },
      { title: 'Module 2: Visualizing Work', topics: ['Designing your board', 'Card types and classes of service', 'Workflow mapping'] },
      { title: 'Module 3: WIP Limits', topics: ['Why limit work-in-progress', 'Setting effective limits', 'Managing pull systems'] },
      { title: 'Module 4: Flow Management', topics: ['Measuring flow', 'Identifying blockers', 'Daily standups with Kanban'] }
    ]
  },
  ksd: {
    id: 'ksd',
    name: 'Kanban System Design',
    acronym: 'KSD',
    level: 'Intermediate',
    duration: '2 days',
    price: 'Contact for pricing',
    icon: 'fa-project-diagram',
    color: '#9333ea',
    shortDescription: 'Design robust Kanban systems for your organization. Master system thinking and evolutionary change.',
    description: 'The Kanban System Design (KSD) course provides a deep understanding of the Kanban Method and how to design Kanban systems for knowledge work. This intermediate-level course equips you with the skills to implement Kanban at scale across teams and departments.',
    audience: [
      'Managers and team leads',
      'Agile Coaches and Consultants',
      'Process improvement specialists',
      'TKP graduates ready for the next level'
    ],
    outcomes: [
      'Design complete Kanban systems from scratch',
      'Implement classes of service and work item types',
      'Establish feedback loops and cadences',
      'Apply the STATIK approach to Kanban implementation',
      'Use cumulative flow diagrams for system analysis'
    ],
    curriculum: [
      { title: 'Module 1: Systems Thinking', topics: ['Understanding complex systems', 'Feedback loops', 'Emergent behavior'] },
      { title: 'Module 2: The STATIK Approach', topics: ['Systems Thinking Approach to Introducing Kanban', 'Stakeholder analysis', 'Demand analysis'] },
      { title: 'Module 3: Designing the System', topics: ['Board design patterns', 'Policies and agreements', 'Classes of service'] },
      { title: 'Module 4: Metrics & Analytics', topics: ['Flow metrics', 'Cumulative flow diagrams', 'Monte Carlo simulations'] }
    ]
  },
  ksi: {
    id: 'ksi',
    name: 'Kanban Systems Improvement',
    acronym: 'KSI',
    level: 'Advanced',
    duration: '2 days',
    price: 'Contact for pricing',
    icon: 'fa-chart-line',
    color: '#a855f7',
    shortDescription: 'Take your Kanban practice to the next level. Drive organizational improvement through advanced techniques.',
    description: 'The Kanban Systems Improvement (KSI) course is an advanced training for experienced Kanban practitioners who want to drive organizational change and continuous improvement. Learn advanced analytics, coaching techniques, and strategies for scaling Kanban.',
    audience: [
      'Experienced Kanban practitioners',
      'Organizational change agents',
      'Senior Agile Coaches',
      'KSD graduates seeking mastery'
    ],
    outcomes: [
      'Apply advanced flow analytics for decision-making',
      'Coach teams through Kanban maturity levels',
      'Design and facilitate improvement experiments',
      'Scale Kanban across multiple teams and portfolios',
      'Navigate organizational resistance to change'
    ],
    curriculum: [
      { title: 'Module 1: Advanced Analytics', topics: ['Probabilistic forecasting', 'Risk analysis', 'SLE and service delivery'] },
      { title: 'Module 2: Evolutionary Change', topics: ['Managing resistance', 'Cultural transformation', 'Leadership at every level'] },
      { title: 'Module 3: Scaling Kanban', topics: ['Portfolio Kanban', 'Dependencies and coordination', 'Enterprise-level implementation'] },
      { title: 'Module 4: Coaching & Facilitation', topics: ['Coaching techniques', 'Facilitating retrospectives', 'Building improvement culture'] }
    ]
  },
  sbk: {
    id: 'sbk',
    name: 'Scaled Business Kanban',
    acronym: 'SBK',
    level: 'Expert',
    duration: '2 days',
    price: 'Contact for pricing',
    icon: 'fa-building',
    color: '#7c3aed',
    shortDescription: 'Enterprise-level Kanban for business agility. Align strategy to execution across your entire organization.',
    description: 'Scaled Business Kanban (SBK) is designed for senior leaders and enterprise coaches who need to apply Kanban principles at the organizational level. This expert-level course bridges strategy and execution, enabling true business agility.',
    audience: [
      'C-suite executives and VPs',
      'Enterprise Agile Coaches',
      'Portfolio and Program Managers',
      'Business transformation leaders'
    ],
    outcomes: [
      'Align organizational strategy with Kanban execution',
      'Design portfolio-level Kanban systems',
      'Implement business agility frameworks',
      'Drive cultural transformation at scale',
      'Measure and communicate business value'
    ],
    curriculum: [
      { title: 'Module 1: Business Agility', topics: ['Strategic alignment', 'Value stream mapping', 'Business model integration'] },
      { title: 'Module 2: Portfolio Management', topics: ['Portfolio Kanban design', 'Investment allocation', 'Capacity planning'] },
      { title: 'Module 3: Enterprise Scaling', topics: ['Multi-team coordination', 'Cross-functional dependencies', 'Enterprise metrics'] },
      { title: 'Module 4: Transformation Leadership', topics: ['Change leadership', 'Organizational design', 'Sustaining improvement'] }
    ]
  }
};

module.exports = courses;
