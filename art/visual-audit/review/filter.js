document.querySelector('#filter').addEventListener('input',e=>{for(const r of document.querySelectorAll('tbody tr'))r.hidden=!r.dataset.search.includes(e.target.value.toLowerCase())})
