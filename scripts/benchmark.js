// Benchmark for getPendingRequests data transformation overhead
const { performance } = require('perf_hooks');

function oldGetPendingRequestsTransform(data, profiles) {
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return data.map(f => ({
    requester: profileMap.get(f.user_id_1),
    user_id_1: f.user_id_1,
    user_id_2: f.user_id_2,
  })).filter(r => r.requester != null);
}

function newGetPendingRequestsTransform(data, profiles) {
  const profileMap = new Map();
  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    profileMap.set(p.id, p);
  }

  const result = [];
  for (let i = 0; i < data.length; i++) {
    const f = data[i];
    const requester = profileMap.get(f.user_id_1);
    if (requester) {
      result.push({
        requester,
        user_id_1: f.user_id_1,
        user_id_2: f.user_id_2,
      });
    }
  }
  return result;
}

function runBenchmark(numItems = 5000, iterations = 1000) {
  const data = Array.from({ length: numItems }, (_, i) => ({
    user_id_1: `user_${i}`,
    user_id_2: 'target_user',
  }));

  const profiles = Array.from({ length: numItems }, (_, i) => ({
    id: `user_${i}`,
    full_name: `User ${i}`,
    avatar_url: null,
    updated_at: null,
  }));

  // Warmup
  for (let i = 0; i < 50; i++) {
    oldGetPendingRequestsTransform(data, profiles);
    newGetPendingRequestsTransform(data, profiles);
  }

  const startOld = performance.now();
  for (let i = 0; i < iterations; i++) {
    oldGetPendingRequestsTransform(data, profiles);
  }
  const endOld = performance.now();
  const timeOld = endOld - startOld;

  const startNew = performance.now();
  for (let i = 0; i < iterations; i++) {
    newGetPendingRequestsTransform(data, profiles);
  }
  const endNew = performance.now();
  const timeNew = endNew - startNew;

  const improvementPct = (((timeOld - timeNew) / timeOld) * 100).toFixed(2);

  console.log(`=== Benchmark Results (Items: ${numItems}, Iterations: ${iterations}) ===`);
  console.log(`Baseline (Old): ${timeOld.toFixed(2)} ms`);
  console.log(`Optimized (New): ${timeNew.toFixed(2)} ms`);
  console.log(`Improvement: ${improvementPct}% faster`);

  return { timeOld, timeNew, improvementPct };
}

// Correctness verification
function verifyCorrectness() {
  const testCases = [
    {
      name: 'Empty data and profiles',
      data: [],
      profiles: [],
    },
    {
      name: 'All profiles matching',
      data: [
        { user_id_1: 'u1', user_id_2: 'u0' },
        { user_id_1: 'u2', user_id_2: 'u0' },
      ],
      profiles: [
        { id: 'u1', full_name: 'Alice' },
        { id: 'u2', full_name: 'Bob' },
      ],
    },
    {
      name: 'Some profiles missing',
      data: [
        { user_id_1: 'u1', user_id_2: 'u0' },
        { user_id_1: 'u2', user_id_2: 'u0' },
        { user_id_1: 'u3', user_id_2: 'u0' },
      ],
      profiles: [
        { id: 'u1', full_name: 'Alice' },
        { id: 'u3', full_name: 'Charlie' },
      ],
    },
  ];

  for (const tc of testCases) {
    const resOld = oldGetPendingRequestsTransform(tc.data, tc.profiles);
    const resNew = newGetPendingRequestsTransform(tc.data, tc.profiles);
    const match = JSON.stringify(resOld) === JSON.stringify(resNew);
    if (!match) {
      console.error(`Correctness check failed for case "${tc.name}"!`);
      console.error('Old:', resOld);
      console.error('New:', resNew);
      process.exit(1);
    }
  }
  console.log('✅ Correctness checks passed: Old and New outputs are identical for all edge cases.');
}

verifyCorrectness();
runBenchmark(5000, 1000);
