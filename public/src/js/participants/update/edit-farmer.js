/**
 * Edit Farmer Personal Information & Synchronized Fields Manager
 * DA-TMIS - Training Management Information System
 */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('editFarmerPersonalForm');
  if (!form) return;

  // Personal Information Elements
  const indigenousGroupSelect = document.getElementById('farmer_indigenous_group');
  const tribeNameInput = document.getElementById('farmer_tribe_name');
  const dietaryRestrictionSelect = document.getElementById('farmer_dietary_restriction');
  const allergiesOnInput = document.getElementById('farmer_allergies_on');

  // Address Hierarchy Elements
  const regionSelect = document.getElementById('farmer_region');
  const districtSelect = document.getElementById('farmer_district');
  const provinceSelect = document.getElementById('farmer_province');
  const municipalitySelect = document.getElementById('farmer_municipality');
  const barangaySelect = document.getElementById('farmer_barangay');
  const postalCodeInput = document.getElementById('farmer_postal_code');

  // Comprehensive Address Hierarchy (Region -> District -> Province -> Municipality -> Barangay)
  const addressHierarchy = {
    region_4a: {
      label: 'Region IV-A (CALABARZON)',
      districts: {
        quezon_4th: {
          label: 'Quezon 4th District',
          provinces: {
            quezon: {
              label: 'Quezon',
              municipalities: {
                alabat: {
                  label: 'Alabat',
                  postalCode: '4331',
                  barangays: {
                    villa_jesus_weste: 'Villa Jesus Weste',
                    villa_jesus_este: 'Villa Jesus Este',
                    villa_norte: 'Villa Norte',
                    villa_esperanza: 'Villa Esperanza',
                    caglate: 'Caglate',
                    angeles: 'Angeles',
                    bacong: 'Bacong',
                    poblacion: 'Poblacion'
                  }
                },
                perez: {
                  label: 'Perez',
                  postalCode: '4334',
                  barangays: {
                    villamanzano_sur: 'Villamanzano Sur',
                    villamanzano_norte: 'Villamanzano Norte',
                    mainit: 'Mainit',
                    pinagtubigan: 'Pinagtubigan',
                    sangirin: 'Sangirin'
                  }
                },
                quezon_mun: {
                  label: 'Quezon (Municipality)',
                  postalCode: '4332',
                  barangays: {
                    apoc_apoc: 'Apoc-Apoc',
                    delgado: 'Delgado',
                    guinhawa: 'Guinhawa',
                    masculino: 'Masculino',
                    tagkawayan: 'Tagkawayan'
                  }
                },
                gumaca: {
                  label: 'Gumaca',
                  postalCode: '4307',
                  barangays: {
                    tabing_dagat: 'Tabing Dagat',
                    villa_mendoza: 'Villa Mendoza',
                    camflora: 'Camflora',
                    hagakhakin: 'Hagakhakin'
                  }
                },
                lopez: {
                  label: 'Lopez',
                  postalCode: '4316',
                  barangays: {
                    danlagan: 'Danlagan',
                    magsaysay: 'Magsaysay',
                    san_roque: 'San Roque',
                    talolong: 'Talolong'
                  }
                },
                atimonan: {
                  label: 'Atimonan',
                  postalCode: '4300',
                  barangays: {
                    angeles: 'Angeles',
                    caridad_ibaba: 'Caridad Ibaba',
                    tagbakin: 'Tagbakin'
                  }
                },
                calauag: {
                  label: 'Calauag',
                  postalCode: '4318',
                  barangays: {
                    anibawan: 'Anibawan',
                    biyan: 'Biyan',
                    poblacion: 'Poblacion'
                  }
                },
                guinayangan: {
                  label: 'Guinayangan',
                  postalCode: '4319',
                  barangays: {
                    aloneros: 'Aloneros',
                    danlagan_bago: 'Danlagan Bago',
                    poblacion: 'Poblacion'
                  }
                },
                tagkawayan: {
                  label: 'Tagkawayan',
                  postalCode: '4321',
                  barangays: {
                    aldavoc: 'Aldavoc',
                    poblacion: 'Poblacion',
                    san_vicente: 'San Vicente'
                  }
                }
              }
            }
          }
        },
        quezon_1st: {
          label: 'Quezon 1st District',
          provinces: {
            quezon_p1: {
              label: 'Quezon',
              municipalities: {
                jomalig: {
                  label: 'Jomalig',
                  postalCode: '4342',
                  barangays: {
                    apad: 'Apad',
                    bukal: 'Bukal',
                    casuguran: 'Casuguran',
                    gango: 'Gango',
                    talisoy: 'Talisoy'
                  }
                },
                patnanungan: {
                  label: 'Patnanungan',
                  postalCode: '4341',
                  barangays: {
                    amaga: 'Amaga',
                    busdak: 'Busdak',
                    kilogan: 'Kilogan',
                    luod: 'Luod',
                    poblacion: 'Poblacion'
                  }
                },
                polillo: {
                  label: 'Polillo',
                  postalCode: '4339',
                  barangays: {
                    anibawan: 'Anibawan',
                    canicanian: 'Canicanian',
                    poblacion: 'Poblacion',
                    tamulaya: 'Tamulaya'
                  }
                },
                infanta: {
                  label: 'Infanta',
                  postalCode: '4336',
                  barangays: {
                    aguit_it: 'Aguit-it',
                    banugao: 'Banugao',
                    poblacion: 'Poblacion',
                    tongohin: 'Tongohin'
                  }
                },
                real: {
                  label: 'Real',
                  postalCode: '4335',
                  barangays: {
                    capalong: 'Capalong',
                    kiloloron: 'Kiloloron',
                    poblacion_1: 'Poblacion 1'
                  }
                },
                panukulan: {
                  label: 'Panukulan',
                  postalCode: '4337',
                  barangays: {
                    balungay: 'Balungay',
                    bonbon: 'Bonbon',
                    poblacion: 'Poblacion'
                  }
                },
                burdeos: {
                  label: 'Burdeos',
                  postalCode: '4340',
                  barangays: {
                    aluyon: 'Aluyon',
                    calutan: 'Calutan',
                    poblacion: 'Poblacion'
                  }
                }
              }
            }
          }
        },
        laguna_1st: {
          label: 'Laguna 1st District',
          provinces: {
            laguna: {
              label: 'Laguna',
              municipalities: {
                los_banos: {
                  label: 'Los Baños',
                  postalCode: '4030',
                  barangays: {
                    batong_malake: 'Batong Malake',
                    bayog: 'Bayog',
                    lalakay: 'Lalakay',
                    mayondon: 'Mayondon',
                    san_antonio: 'San Antonio'
                  }
                },
                pakil: {
                  label: 'Pakil',
                  postalCode: '4017',
                  barangays: {
                    banilan: 'Banilan',
                    casa_real: 'Casa Real',
                    matikiw: 'Matikiw'
                  }
                }
              }
            }
          }
        }
      }
    },
    region_1: {
      label: 'Region I (Ilocos Region)',
      districts: {
        pangasinan_1st: {
          label: 'Pangasinan 1st District',
          provinces: {
            pangasinan: {
              label: 'Pangasinan',
              municipalities: {
                alaminos: {
                  label: 'Alaminos',
                  postalCode: '2404',
                  barangays: {
                    alos: 'Alos',
                    baleyadaan: 'Baleyadaan',
                    lucap: 'Lucap',
                    poblacion: 'Poblacion'
                  }
                }
              }
            }
          }
        }
      }
    },
    region_3: {
      label: 'Region III (Central Luzon)',
      districts: {
        ne_1st: {
          label: 'Nueva Ecija 1st District',
          provinces: {
            nueva_ecija: {
              label: 'Nueva Ecija',
              municipalities: {
                cabanatuan: {
                  label: 'Cabanatuan',
                  postalCode: '3100',
                  barangays: {
                    bitas: 'Bitas',
                    dicarma: 'Dicarma',
                    mabini_homesite: 'Mabini Homesite',
                    san_josef_sur: 'San Josef Sur'
                  }
                }
              }
            }
          }
        }
      }
    },
    ncr: {
      label: 'National Capital Region (NCR)',
      districts: {
        ncr_1st: {
          label: 'NCR 1st District',
          provinces: {
            metro_manila: {
              label: 'Metro Manila',
              municipalities: {
                manila: {
                  label: 'City of Manila',
                  postalCode: '1000',
                  barangays: {
                    binondo: 'Binondo (Brgy 287)',
                    ermita: 'Ermita (Brgy 659)',
                    malate: 'Malate (Brgy 688)',
                    sampaloc: 'Sampaloc (Brgy 395)',
                    tondo: 'Tondo (Brgy 1)'
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  // 1. Sync Indigenous Group -> Tribe Name
  const syncIndigenousGroup = () => {
    if (!indigenousGroupSelect || !tribeNameInput) return;
    const isIP = indigenousGroupSelect.value === 'Yes';
    tribeNameInput.disabled = !isIP;
    if (isIP) {
      tribeNameInput.placeholder = 'Type tribe name';
    } else {
      tribeNameInput.value = '';
      tribeNameInput.placeholder = 'Disabled (Not an IP)';
    }
  };

  indigenousGroupSelect?.addEventListener('change', () => {
    syncIndigenousGroup();
    if (indigenousGroupSelect.value === 'Yes') {
      tribeNameInput.focus();
    }
  });

  // 2. Sync Dietary Restriction -> Allergies On
  const syncDietaryRestriction = () => {
    if (!dietaryRestrictionSelect || !allergiesOnInput) return;
    const hasAllergies = dietaryRestrictionSelect.value === 'Allergies';
    allergiesOnInput.disabled = !hasAllergies;
    if (hasAllergies) {
      allergiesOnInput.placeholder = 'Type allergies they have';
    } else {
      allergiesOnInput.value = '';
      allergiesOnInput.placeholder = 'Disabled (No allergies specified)';
    }
  };

  dietaryRestrictionSelect?.addEventListener('change', () => {
    syncDietaryRestriction();
    if (dietaryRestrictionSelect.value === 'Allergies') {
      allergiesOnInput.focus();
    }
  });

  // 3. Address Hierarchy Synchronization
  const resetSelect = (select, placeholder = 'Choose...') => {
    if (!select) return;
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);
    select.disabled = true;
  };

  const populateSelect = (select, records, placeholder = 'Choose...', selectedKey = '') => {
    if (!select) return;
    select.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);

    if (records) {
      Object.entries(records).forEach(([key, value]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = typeof value === 'string' ? value : value.label;
        if (key === selectedKey) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      select.disabled = false;
    }
  };

  const syncAddressHierarchy = (targetDistrict = '', targetProvince = '', targetMunicipality = '', targetBarangay = '') => {
    const selectedRegionKey = regionSelect?.value;
    const selectedRegion = addressHierarchy[selectedRegionKey];

    if (!selectedRegion) {
      resetSelect(districtSelect, 'Choose Region first');
      resetSelect(provinceSelect, 'Choose District first');
      resetSelect(municipalitySelect, 'Choose Province first');
      resetSelect(barangaySelect, 'Choose Municipality first');
      return;
    }

    populateSelect(districtSelect, selectedRegion.districts, 'Choose District...', targetDistrict || districtSelect.value);
    syncDistrict(targetProvince, targetMunicipality, targetBarangay);
  };

  const syncDistrict = (targetProvince = '', targetMunicipality = '', targetBarangay = '') => {
    const selectedRegionKey = regionSelect?.value;
    const selectedDistrictKey = districtSelect?.value;
    const selectedDistrict = addressHierarchy[selectedRegionKey]?.districts[selectedDistrictKey];

    if (!selectedDistrict) {
      resetSelect(provinceSelect, 'Choose District first');
      resetSelect(municipalitySelect, 'Choose Province first');
      resetSelect(barangaySelect, 'Choose Municipality first');
      return;
    }

    populateSelect(provinceSelect, selectedDistrict.provinces, 'Choose Province...', targetProvince || provinceSelect.value);
    syncProvince(targetMunicipality, targetBarangay);
  };

  const syncProvince = (targetMunicipality = '', targetBarangay = '') => {
    const selectedRegionKey = regionSelect?.value;
    const selectedDistrictKey = districtSelect?.value;
    const selectedProvinceKey = provinceSelect?.value;
    const selectedProvince = addressHierarchy[selectedRegionKey]?.districts[selectedDistrictKey]?.provinces[selectedProvinceKey];

    if (!selectedProvince) {
      resetSelect(municipalitySelect, 'Choose Province first');
      resetSelect(barangaySelect, 'Choose Municipality first');
      return;
    }

    populateSelect(municipalitySelect, selectedProvince.municipalities, 'Choose Municipality...', targetMunicipality || municipalitySelect.value);
    syncMunicipality(targetBarangay);
  };

  const syncMunicipality = (targetBarangay = '') => {
    const selectedRegionKey = regionSelect?.value;
    const selectedDistrictKey = districtSelect?.value;
    const selectedProvinceKey = provinceSelect?.value;
    const selectedMunicipalityKey = municipalitySelect?.value;
    const selectedMunicipality = addressHierarchy[selectedRegionKey]?.districts[selectedDistrictKey]?.provinces[selectedProvinceKey]?.municipalities[selectedMunicipalityKey];

    if (!selectedMunicipality) {
      resetSelect(barangaySelect, 'Choose Municipality first');
      return;
    }

    populateSelect(barangaySelect, selectedMunicipality.barangays, 'Choose Barangay...', targetBarangay || barangaySelect.value);

    // Auto-update postal code if defined
    if (postalCodeInput && selectedMunicipality.postalCode) {
      postalCodeInput.value = selectedMunicipality.postalCode;
    }
  };

  regionSelect?.addEventListener('change', () => syncAddressHierarchy());
  districtSelect?.addEventListener('change', () => syncDistrict());
  provinceSelect?.addEventListener('change', () => syncProvince());
  municipalitySelect?.addEventListener('change', () => syncMunicipality());

  // Initialize Regions and pre-select current farmer address
  const initAddress = () => {
    if (!regionSelect) return;
    regionSelect.innerHTML = '';
    const defaultRegion = document.createElement('option');
    defaultRegion.value = '';
    defaultRegion.textContent = 'Choose Region...';
    regionSelect.appendChild(defaultRegion);

    Object.entries(addressHierarchy).forEach(([key, region]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = region.label;
      if (key === 'region_4a') option.selected = true;
      regionSelect.appendChild(option);
    });

    // Cascade initial selections: Quezon 4th District -> Quezon -> Alabat -> Villa Jesus Weste
    syncAddressHierarchy('quezon_4th', 'quezon', 'alabat', 'villa_jesus_weste');
  };

  // Initial runs
  syncIndigenousGroup();
  syncDietaryRestriction();
  initAddress();

  // Registration Date Sync to Display Banner
  const regDateInput = document.getElementById('farmer_registration_date');
  const displayRegDate = document.getElementById('displayRegistrationDate');
  const readableRegDate = document.getElementById('farmerRegistrationDateReadable');
  const updateDisplayDate = () => {
    if (!regDateInput || !regDateInput.value) return;
    const formattedDate = window.TmisDate?.format(regDateInput.value, { dateStyle: 'long' }) || 'Date not recorded';
    if (displayRegDate) displayRegDate.textContent = formattedDate;
    if (readableRegDate) readableRegDate.textContent = formattedDate;
  };
  regDateInput?.addEventListener('change', updateDisplayDate);
  updateDisplayDate();

  // Reset event listener
  form.addEventListener('reset', () => {
    setTimeout(() => {
      syncIndigenousGroup();
      syncDietaryRestriction();
      initAddress();
      if (postalCodeInput) postalCodeInput.value = '4331';
      updateDisplayDate();
    }, 50);
  });

  // Form Submit / Save changes handler with Feedback Toast
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const saveBtn = document.getElementById('saveFarmerBtn');
    if (saveBtn) {
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Saving...';

      try {
        const current = window.TmisStore.selected('tmis-farmers');
        if(!current) throw new Error('Open an existing participant from the list.');
        const values=Object.fromEntries(new FormData(form));
        for(const name of ['district','province','municipality','barangay']) {
          const select=form.elements.namedItem(name); if(select?.selectedOptions[0]?.value) values[name]=select.selectedOptions[0].textContent;
        }
        const savedFarmer = await window.TmisStore.saveRecord('tmis-farmers',{...current,...values});
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
        const displayUpdatedDate = document.getElementById('displayUpdatedDate');
        if (displayUpdatedDate) {
          displayUpdatedDate.textContent = savedFarmer?.updatedAt ? window.TmisDate.format(savedFarmer.updatedAt, { dateStyle: 'long' }) : 'No record updated';
        }
        showToast('Farmer Profile Updated', 'Farmer personal, address, and contact information have been updated successfully.');
      } catch(error) {
        window.TmisToast?.show(error.message || 'The profile could not be saved.', 'error');
      } finally {saveBtn.disabled=false;saveBtn.innerHTML=originalText;}

    }
  });

  // Toast Notification Helper
  function showToast(title, message) {
    let toastContainer = document.querySelector('.farmer-save-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'farmer-save-toast-container toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
      <div id="${toastId}" class="toast align-items-center text-bg-success border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <i class="bi bi-check-circle-fill fs-5"></i>
            <div>
              <strong>${title}</strong>
              <div class="small">${message}</div>
            </div>
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    if (window.bootstrap && window.bootstrap.Toast) {
      const bsToast = new bootstrap.Toast(toastElement, { delay: 4000 });
      bsToast.show();
      toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
    } else {
      setTimeout(() => toastElement.remove(), 4000);
    }
  }

  // Farmer registration redirect or mock
  const registerFarmerBtn = document.getElementById('registerFarmerBtn');
  registerFarmerBtn?.addEventListener('click', () => {
    window.location.href = '../../participants/create/register';
  });
});
