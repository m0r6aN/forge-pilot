'use client'

import { useState } from 'react'
import { BusinessIdeaGenerator, BusinessIdea } from '@/lib/ai/business-idea-generator'

export default function BusinessIdeasPage() {
  const [ideas, setIdeas] = useState<BusinessIdea[]>([])
  const [selectedServices, setSelectedServices] = useState<Map<string, boolean>>(new Map())
  const [totalCost, setTotalCost] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleGenerateIdeas = async (formData: any) => {
    setLoading(true)
    const generator = new BusinessIdeaGenerator()
    const generatedIdeas = await generator.generateBusinessIdeas(formData)
    setIdeas(generatedIdeas)
    setLoading(false)
  }

  const toggleService = (service: string, cost: number) => {
    const newSelected = new Map(selectedServices)
    if (newSelected.has(service)) {
      newSelected.delete(service)
      setTotalCost(prev => prev - cost)
    } else {
      newSelected.set(service, true)
      setTotalCost(prev => prev + cost)
    }
    setSelectedServices(newSelected)
  }

  const executeBusinessPlan = async (businessIdea: BusinessIdea) => {
    // Walk user through step-by-step business creation
    const steps = [
      'Generate brand identity',
      'Register domain',
      'Create business entity',
      'Build website',
      'Setup marketing campaigns',
      'Configure customer support',
      'Launch business'
    ]
    
    // Navigate to execution wizard
    window.location.href = `/business-execution?ideaId=${businessIdea.id}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            🧠 AI Business Idea Generator
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Discover profitable business opportunities and launch them in minutes
          </p>
        </div>

        {/* Business Idea Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Tell us about yourself</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white mb-2">Your interests</label>
              <input 
                type="text" 
                placeholder="Technology, fitness, cooking..."
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300"
              />
            </div>
            
            <div>
              <label className="block text-white mb-2">Your skills</label>
              <input 
                type="text" 
                placeholder="Marketing, programming, design..."
                className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300"
              />
            </div>
            
            <div>
              <label className="block text-white mb-2">Available budget</label>
              <select className="w-full p-3 rounded-lg bg-white/20 text-white">
                <option value="1000">$1,000 - $5,000</option>
                <option value="5000">$5,000 - $10,000</option>
                <option value="10000">$10,000 - $25,000</option>
                <option value="25000">$25,000+</option>
              </select>
            </div>
            
            <div>
              <label className="block text-white mb-2">Time commitment</label>
              <select className="w-full p-3 rounded-lg bg-white/20 text-white">
                <option value="part-time">Part-time (10-20 hours/week)</option>
                <option value="full-time">Full-time (40+ hours/week)</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => handleGenerateIdeas({})}
            disabled={loading}
            className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating Ideas...' : '🚀 Generate Business Ideas'}
          </button>
        </div>

        {/* Generated Ideas */}
        {ideas.map((idea, index) => (
          <div key={idea.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2">{idea.name}</h3>
                <p className="text-gray-300 text-lg">{idea.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  ${idea.revenueProjections.year1.toLocaleString()}/year
                </div>
                <div className="text-sm text-gray-400">Projected Year 1</div>
              </div>
            </div>

            {/* Market Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Market Size</h4>
                <p className="text-gray-300">{idea.marketAnalysis.size}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Competition</h4>
                <p className="text-gray-300">{idea.marketAnalysis.competition}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Risk Level</h4>
                <p className="text-gray-300 capitalize">{idea.riskAssessment.level}</p>
              </div>
            </div>

            {/* Required Services Checklist */}
            <div className="mb-8">
              <h4 className="text-xl font-bold text-white mb-4">
                🛠️ Services Needed to Launch
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {idea.requiredServices.map((service, serviceIndex) => (
                  <div 
                    key={serviceIndex}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedServices.has(service.service)
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-gray-600 bg-white/5'
                    }`}
                    onClick={() => toggleService(service.service, service.cost)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-white font-semibold">{service.service}</h5>
                        <p className="text-gray-300 text-sm">{service.description}</p>
                        <div className="flex items-center mt-2">
                          {service.brandgenieOffering && (
                            <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs mr-2">
                              BrandGenie
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs ${
                            service.priority === 'essential' ? 'bg-red-600' :
                            service.priority === 'recommended' ? 'bg-yellow-600' :
                            'bg-gray-600'
                          } text-white`}>
                            {service.priority}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">
                          ${service.cost === 0 ? 'Included' : service.cost}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Summary & Launch Button */}
            <div className="flex justify-between items-center p-6 bg-white/10 rounded-lg">
              <div>
                <div className="text-2xl font-bold text-white">
                  Total Setup Cost: ${totalCost.toLocaleString()}
                </div>
                <div className="text-gray-300">
                  + ${149}/month BrandGenie Growth Plan
                </div>
              </div>
              
              <button
                onClick={() => executeBusinessPlan(idea)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                🚀 Launch This Business
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}