function App() {
  return (
    <div>
      <header>
        <h1>CRM Dashboard</h1>
        <nav>
          <button>Dashboard</button>
          <button>Customers</button>
          <button>Interactions</button>
        </nav>
      </header>

      <main>
        <h2>Welcome to the CRM</h2>

        <div>
          <h3>Customers</h3>
          <p>Customer information will appear here.</p>
        </div>

        <div>
          <h3>Recent Interactions</h3>
          <p>Recent customer interactions will appear here.</p>
        </div>
      </main>
    </div>
  );
}

export default App;
